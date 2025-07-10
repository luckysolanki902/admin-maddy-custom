import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import { sendEmail } from '@/lib/nodemailer';
import dayjs from 'dayjs';

/**
 * POST /api/admin/rto/send-report
 * 
 * Sends RTO reports via email to sg.gupta2241@gmail.com
 */
export async function POST(req) {
  try {
    await connectToDatabase();

    const { reportType, startDate, endDate } = await req.json();

    // Calculate date range based on report type
    let reportStartDate, reportEndDate, reportTitle;
    
    if (reportType === 'daily') {
      reportStartDate = dayjs().startOf('day');
      reportEndDate = dayjs().endOf('day');
      reportTitle = 'Daily RTO Report';
    } else if (reportType === 'weekly') {
      reportStartDate = dayjs().startOf('week');
      reportEndDate = dayjs().endOf('week');
      reportTitle = 'Weekly RTO Report';
    } else if (reportType === 'monthly') {
      reportStartDate = dayjs().startOf('month');
      reportEndDate = dayjs().endOf('month');
      reportTitle = 'Monthly RTO Report';
    } else {
      reportStartDate = dayjs(startDate);
      reportEndDate = dayjs(endDate);
      reportTitle = 'Custom RTO Report';
    }

    // Fetch RTO data for the period
    const rtoQuery = {
      deliveryStatus: {
        $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
      },
      createdAt: {
        $gte: reportStartDate.toDate(),
        $lte: reportEndDate.toDate()
      }
    };

    const totalRTOs = await Order.countDocuments(rtoQuery);
    
    // Get total orders for RTO rate calculation
    const totalOrders = await Order.countDocuments({
      createdAt: {
        $gte: reportStartDate.toDate(),
        $lte: reportEndDate.toDate()
      },
      paymentStatus: { $nin: ['pending', 'failed'] }
    });

    const rtoRate = totalOrders > 0 ? (totalRTOs / totalOrders) * 100 : 0;

    // Get RTO value
    const rtoValueData = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' },
          averageValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const rtoValue = rtoValueData[0]?.totalValue || 0;
    const averageRtoValue = rtoValueData[0]?.averageValue || 0;

    // Get top RTO reasons
    const topRtoReasons = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: { $ifNull: ['$rtoReason', 'Unknown'] },
          count: { $sum: 1 },
          percentage: {
            $multiply: [
              { $divide: [{ $sum: 1 }, totalRTOs || 1] },
              100
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get RTOs by state
    const rtosByState = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Previous period comparison
    const previousPeriodStart = reportStartDate.subtract(
      reportEndDate.diff(reportStartDate, 'days'),
      'days'
    );
    const previousPeriodEnd = reportStartDate.subtract(1, 'day');

    const previousRTOs = await Order.countDocuments({
      deliveryStatus: {
        $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
      },
      createdAt: {
        $gte: previousPeriodStart.toDate(),
        $lte: previousPeriodEnd.toDate()
      }
    });

    const rtoTrend = previousRTOs > 0 ? ((totalRTOs - previousRTOs) / previousRTOs) * 100 : 0;

    // Generate email content
    const emailHTML = generateRTOReportHTML({
      reportTitle,
      period: `${reportStartDate.format('DD/MM/YYYY')} - ${reportEndDate.format('DD/MM/YYYY')}`,
      totalRTOs,
      rtoRate: rtoRate.toFixed(2),
      rtoValue,
      averageRtoValue: averageRtoValue.toFixed(2),
      rtoTrend: rtoTrend.toFixed(2),
      topRtoReasons,
      rtosByState,
      totalOrders
    });

    // Send email using the nodemailer utility
    const emailResult = await sendEmail({
      to: 'sg.gupta2241@gmail.com',
      subject: `${reportTitle} - ${reportStartDate.format('DD/MM/YYYY')}`,
      html: emailHTML
    });

    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`);
    }

    return Response.json({
      success: true,
      message: 'RTO report sent successfully',
      emailResult: {
        sent: emailResult.success,
        messageId: emailResult.messageId
      },
      reportData: {
        totalRTOs,
        rtoRate: parseFloat(rtoRate.toFixed(2)),
        rtoValue,
        averageRtoValue: parseFloat(averageRtoValue.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Error sending RTO report:', error);
    return Response.json(
      { error: 'Failed to send RTO report', details: error.message },
      { status: 500 }
    );
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
      <title>${reportTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f44336, #e91e63); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #f44336; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; margin: 10px 0; }
        .metric-label { color: #666; font-size: 0.9em; }
        .section { margin: 30px 0; }
        .section h3 { color: #333; border-bottom: 2px solid #f44336; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .trend { display: inline-flex; align-items: center; gap: 5px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${reportTitle}</h1>
          <p>Period: ${period}</p>
          <p>Generated on ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        </div>
        
        <div class="content">
          <!-- Key Metrics -->
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${totalRTOs}</div>
              <div class="metric-label">Total RTOs</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${rtoRate}%</div>
              <div class="metric-label">RTO Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">₹${Number(rtoValue).toLocaleString()}</div>
              <div class="metric-label">Lost Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">₹${Number(averageRtoValue).toLocaleString()}</div>
              <div class="metric-label">Avg RTO Value</div>
            </div>
          </div>

          <!-- Trend Analysis -->
          <div class="section">
            <h3>📊 Trend Analysis</h3>
            <p>
              <span class="trend">
                ${trendIcon}
                <span style="color: ${trendColor}; font-weight: bold;">
                  ${Math.abs(parseFloat(rtoTrend)).toFixed(1)}% ${parseFloat(rtoTrend) > 0 ? 'increase' : 'decrease'}
                </span>
              </span>
              compared to previous period
            </p>
            <p><strong>Total Orders:</strong> ${totalOrders}</p>
            <p><strong>RTO Impact:</strong> ${((totalRTOs / totalOrders) * 100).toFixed(1)}% of all orders</p>
          </div>

          <!-- Top RTO Reasons -->
          <div class="section">
            <h3>🔍 Top RTO Reasons</h3>
            <table>
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
                    <td>${reason._id}</td>
                    <td>${reason.count}</td>
                    <td>${((reason.count / totalRTOs) * 100).toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- RTOs by State -->
          <div class="section">
            <h3>📍 RTOs by State</h3>
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>RTO Count</th>
                  <th>Lost Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${rtosByState.map(state => `
                  <tr>
                    <td>${state._id}</td>
                    <td>${state.count}</td>
                    <td>₹${Number(state.totalValue).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Recommendations -->
          <div class="section">
            <h3>💡 Recommendations</h3>
            <ul>
              <li><strong>Address Verification:</strong> Implement stricter address verification for high RTO states</li>
              <li><strong>Customer Communication:</strong> Improve pre-delivery communication to reduce "customer not available" RTOs</li>
              <li><strong>Packaging Quality:</strong> Review packaging for products with high damage-related RTOs</li>
              <li><strong>Delivery Partners:</strong> Evaluate delivery partner performance in high RTO areas</li>
              <li><strong>COD Optimization:</strong> Consider COD restrictions in high RTO rate areas</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated report from MaddyCustom RTO Dashboard</p>
          <p>For questions or concerns, please contact the admin team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
