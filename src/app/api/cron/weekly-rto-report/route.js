import { connectToDatabase } from '@/lib/db';

/**
 * GET /api/cron/weekly-rto-report
 * 
 * Cron job for sending weekly RTO reports
 * This endpoint will be called by Vercel Cron Jobs weekly
 */
export async function GET(req) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Send weekly RTO report
    const reportResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/rto/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'weekly'
      })
    });

    const reportResult = await reportResponse.json();

    if (reportResponse.ok) {
      console.log('Weekly RTO report sent successfully:', reportResult);
      
      return Response.json({
        success: true,
        message: 'Weekly RTO report sent successfully',
        timestamp: new Date().toISOString(),
        reportData: reportResult.reportData
      });
    } else {
      console.error('Failed to send weekly RTO report:', reportResult);
      
      return Response.json({
        error: 'Failed to send weekly RTO report',
        details: reportResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in weekly RTO report cron job:', error);
    
    return Response.json({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
