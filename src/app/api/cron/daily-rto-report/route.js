import { connectToDatabase } from '@/lib/db';

/**
 * GET /api/cron/daily-rto-report
 * 
 * Cron job for sending daily RTO reports
 * This endpoint will be called by Vercel Cron Jobs daily
 */
export async function GET(req) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Send daily RTO report
    const reportResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/rto/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'daily'
      })
    });

    const reportResult = await reportResponse.json();

    if (reportResponse.ok) {
      console.log('Daily RTO report sent successfully:', reportResult);
      
      return Response.json({
        success: true,
        message: 'Daily RTO report sent successfully',
        timestamp: new Date().toISOString(),
        reportData: reportResult.reportData
      });
    } else {
      console.error('Failed to send daily RTO report:', reportResult);
      
      return Response.json({
        error: 'Failed to send daily RTO report',
        details: reportResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in daily RTO report cron job:', error);
    
    return Response.json({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/daily-rto-report
 * 
 * Manual trigger for daily RTO report (for testing)
 */
export async function POST(req) {
  try {
    await connectToDatabase();

    // Send daily RTO report
    const reportResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/rto/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'daily'
      })
    });

    const reportResult = await reportResponse.json();

    return Response.json({
      success: reportResponse.ok,
      message: reportResponse.ok 
        ? 'Daily RTO report sent successfully' 
        : 'Failed to send daily RTO report',
      reportData: reportResult.reportData || null,
      error: reportResult.error || null
    });

  } catch (error) {
    console.error('Error in manual daily RTO report trigger:', error);
    
    return Response.json({
      error: 'Failed to send daily RTO report',
      details: error.message
    }, { status: 500 });
  }
}
