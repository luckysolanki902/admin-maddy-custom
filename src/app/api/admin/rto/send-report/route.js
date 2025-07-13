import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

/**
 * POST /api/admin/rto/send-report
 * 
 * Sends RTO reports via email using nodemailer with custom recipients
 */
export async function POST(req) {
  try {
    await connectToDatabase();

    const { reportType = 'daily', startDate, endDate, emails = [] } = await req.json();

    // Default to last 24 hours if no dates provided
    const start = startDate ? dayjs(startDate) : dayjs().subtract(1, 'day');
    const end = endDate ? dayjs(endDate) : dayjs();

    // Aggregate RTO data
    const rtoAggregation = await Order.aggregate([
      {
        $match: {
          deliveryStatus: { $in: ['returned', 'returnInitiated', 'lost', 'undelivered'] },
          createdAt: {
            $gte: start.toDate(),
            $lte: end.toDate()
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRTOs: { $sum: 1 },
          totalRtoValue: { $sum: '$totalAmount' },
          averageRtoValue: { $avg: '$totalAmount' },
          rtoReasons: { $push: '$rtoReason' },
          rtosByState: { $push: '$address.state' }
        }
      }
    ]);

    // Get total orders for RTO rate calculation
    const totalOrders = await Order.countDocuments({
      createdAt: {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    });

    const rtoData = rtoAggregation[0] || {
      totalRTOs: 0,
      totalRtoValue: 0,
      averageRtoValue: 0,
      rtoReasons: [],
      rtosByState: []
    };

    // Calculate RTO rate
    const rtoRate = totalOrders > 0 ? ((rtoData.totalRTOs / totalOrders) * 100).toFixed(2) : 0;

    // Process RTO reasons
    const reasonCounts = rtoData.rtoReasons.reduce((acc, reason) => {
      const normalizedReason = reason || 'Unknown';
      acc[normalizedReason] = (acc[normalizedReason] || 0) + 1;
      return acc;
    }, {});

    const topRtoReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Process RTOs by state
    const stateCounts = rtoData.rtosByState.reduce((acc, state) => {
      const normalizedState = state || 'Unknown';
      acc[normalizedState] = (acc[normalizedState] || 0) + 1;
      return acc;
    }, {});

    const rtosByState = Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate trend (this is a simplified calculation)
    const previousPeriodStart = start.subtract(end.diff(start), 'milliseconds');
    const previousPeriodEnd = start;

    const previousRTOs = await Order.countDocuments({
      deliveryStatus: { $in: ['returned', 'returnInitiated', 'lost', 'undelivered'] },
      createdAt: {
        $gte: previousPeriodStart.toDate(),
        $lte: previousPeriodEnd.toDate()
      }
    });

    const rtoTrend = previousRTOs > 0 ? 
      (((rtoData.totalRTOs - previousRTOs) / previousRTOs) * 100).toFixed(1) : 0;

    // Prepare report data
    const reportData = {
      reportTitle: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} RTO Report`,
      period: `${start.format('MMM DD, YYYY')} - ${end.format('MMM DD, YYYY')}`,
      totalRTOs: rtoData.totalRTOs,
      rtoRate: rtoRate,
      rtoValue: rtoData.totalRtoValue,
      averageRtoValue: rtoData.averageRtoValue,
      rtoTrend: rtoTrend,
      topRtoReasons: topRtoReasons,
      rtosByState: rtosByState,
      totalOrders: totalOrders
    };

    // Validate email configuration
    if (!process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASSWORD) {
      return Response.json({
        error: 'Email configuration missing. Please set NODEMAILER_USER and NODEMAILER_PASSWORD environment variables.'
      }, { status: 500 });
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('Email configuration error:', verifyError);
      return Response.json({
        error: 'Email configuration invalid. Please check your Gmail credentials.',
        details: verifyError.message
      }, { status: 500 });
    }

    // Generate email content
    const htmlContent = generateRTOReportHTML(reportData);
    
    // Default recipient if no emails provided
    const recipients = emails.length > 0 ? emails : ['sg.gupta2241@gmail.com'];

    // Send email
    const mailOptions = {
      from: process.env.NODEMAILER_USER,
      to: recipients.join(', '),
      subject: `${reportData.reportTitle} - ${reportData.period}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return Response.json({
      success: true,
      message: 'RTO report sent successfully',
      reportData: reportData,
      recipients: recipients
    });

  } catch (error) {
    console.error('Error sending RTO report:', error);
    
    return Response.json({
      error: 'Failed to send RTO report',
      details: error.message
    }, { status: 500 });
  }
}
// Generate HTML email template for RTO report
function generateRTOReportHTML(data) {
  const {
    reportTitle,
    period,
    totalRTOs,
    rtoRate,
    rtoValue,
    averageRtoValue,
    rtoTrend,
    topRtoReasons,
    rtosByState,
    totalOrders
  } = data;

  const trendIcon = parseFloat(rtoTrend) > 0 ? '📈' : '📉';
  const trendColor = parseFloat(rtoTrend) > 0 ? '#f44336' : '#4caf50';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportTitle}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; line-height: 1.6; }
        .container { max-width: 650px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 30px; }
        .alert { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #ffc107; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .alert strong { color: #856404; }
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
        .metric-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; padding: 20px; border-left: 4px solid #667eea; transition: transform 0.2s; }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-title { font-size: 13px; color: #6c757d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 26px; font-weight: 700; color: #212529; margin-bottom: 5px; }
        .metric-subtitle { font-size: 12px; color: #6c757d; }
        .section-title { font-size: 20px; font-weight: 600; color: #212529; margin: 30px 0 15px 0; border-bottom: 3px solid #667eea; padding-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .data-table th { background: #667eea; color: white; padding: 12px; text-align: left; font-weight: 600; }
        .data-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
        .data-table tbody tr:hover { background-color: #f8f9fa; }
        .footer { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; text-align: center; color: #6c757d; }
        .trend { color: ${trendColor}; font-weight: bold; }
        .recommendation { background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%); border-left: 4px solid #17a2b8; border-radius: 8px; padding: 15px; margin: 15px 0; }
        .recommendation h4 { margin: 0 0 10px 0; color: #0c5460; }
        .recommendation ul { margin: 10px 0 0 0; padding-left: 20px; }
        .recommendation li { margin-bottom: 8px; color: #0c5460; }
        @media (max-width: 600px) {
          .metrics-grid { grid-template-columns: 1fr; }
          .content { padding: 20px; }
          .header { padding: 30px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 ${reportTitle}</h1>
          <p>${period}</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>Executive Summary:</strong> ${totalRTOs} RTOs recorded out of ${totalOrders} total orders, resulting in a ${rtoRate}% RTO rate with ₹${rtoValue.toLocaleString()} in lost revenue.
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-title">Total RTOs</div>
              <div class="metric-value">${totalRTOs.toLocaleString()}</div>
              <div class="metric-subtitle">
                <span class="trend">${trendIcon} ${Math.abs(rtoTrend)}%</span> vs previous period
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-title">RTO Rate</div>
              <div class="metric-value">${rtoRate}%</div>
              <div class="metric-subtitle">Of ${totalOrders.toLocaleString()} total orders</div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Revenue Lost</div>
              <div class="metric-value">₹${rtoValue.toLocaleString()}</div>
              <div class="metric-subtitle">Total financial impact</div>
            </div>

            <div class="metric-card">
              <div class="metric-title">Avg RTO Value</div>
              <div class="metric-value">₹${averageRtoValue.toFixed(0)}</div>
              <div class="metric-subtitle">Per RTO incident</div>
            </div>
          </div>

          <div class="section-title">🔍 Top RTO Reasons</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${topRtoReasons.map(reason => `
                <tr>
                  <td>${reason.reason}</td>
                  <td><strong>${reason.count}</strong></td>
                  <td>${((reason.count / totalRTOs) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">📍 RTOs by State (Top 10)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>State</th>
                <th>RTO Count</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              ${rtosByState.map(state => `
                <tr>
                  <td>${state.state}</td>
                  <td><strong>${state.count}</strong></td>
                  <td>${((state.count / totalRTOs) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="recommendation">
            <h4>💡 Key Recommendations</h4>
            <ul>
              <li><strong>Address Verification:</strong> Implement OTP-based address verification for high-risk areas</li>
              <li><strong>Customer Communication:</strong> Send delivery alerts via SMS/WhatsApp 2 hours before delivery</li>
              <li><strong>COD Optimization:</strong> Restrict COD for high RTO rate pincodes (>15% RTO rate)</li>
              <li><strong>Packaging Quality:</strong> Upgrade packaging for fragile items based on damage reports</li>
              <li><strong>Delivery Partners:</strong> Review and optimize delivery partner performance in problem areas</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>MaddyCustom RTO Analytics</strong></p>
          <p>Report generated on ${dayjs().format('MMMM DD, YYYY [at] HH:mm')} IST</p>
          <p>For support, contact the admin team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
