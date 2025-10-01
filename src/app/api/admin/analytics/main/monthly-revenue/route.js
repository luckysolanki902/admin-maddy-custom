import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let matchStage = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      isTestingOrder: { $ne: true },
    };

    let startDate, endDate;

    if (startDateParam && endDateParam) {
      startDate = dayjs(startDateParam);
      endDate = dayjs(endDateParam);
      matchStage.createdAt = {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      };
    } else {
      const dateRange = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            minDate: { $min: '$createdAt' },
            maxDate: { $max: '$createdAt' },
          },
        },
      ]);

      if (dateRange.length === 0) {
        return new Response(JSON.stringify({ monthlyRevenue: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      startDate = dayjs(dateRange[0].minDate).startOf('month');
      endDate = dayjs().endOf('day');
      matchStage.createdAt = {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      };
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          monthlyRevenue: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1,
            },
          },
          monthlyRevenue: 1,
        },
      },
      { $sort: { date: 1 } },
    ];

    const monthlyRevenueData = await Order.aggregate(aggregationPipeline);

    const allMonths = [];
    const months = endDate.diff(startDate, 'month') + 1;

    for (let i = 0; i < months; i++) {
      allMonths.push(startDate.add(i, 'month').format('YYYY-MM'));
    }

    const revenueMap = {};
    monthlyRevenueData.forEach(entry => {
      const monthStr = dayjs(entry.date).format('YYYY-MM');
      revenueMap[monthStr] = entry.monthlyRevenue;
    });

    const currentMonthStr = dayjs().format('YYYY-MM');
    const secondLastMonthStr = dayjs().subtract(1, 'month').format('YYYY-MM');

    const completeMonthlyRevenueData = allMonths.map(monthStr => {
      const isCurrentOrSecondLast = [currentMonthStr, secondLastMonthStr].includes(monthStr);

      const actualRevenue = revenueMap[monthStr] || 0;
      let predictedRevenue = null;

      if (monthStr === currentMonthStr) {
        const today = dayjs().date();
        const totalDaysInMonth = dayjs().daysInMonth();
        const averageDailyRevenue = actualRevenue / today;
        predictedRevenue = Math.round(averageDailyRevenue * totalDaysInMonth);
      } else if (monthStr === secondLastMonthStr) {
        predictedRevenue = actualRevenue; // Second-to-last month predicted value equals actual
      }

      return {
        date: new Date(`${monthStr}-01`),
        monthlyRevenue: actualRevenue,
        predictedRevenue: isCurrentOrSecondLast ? predictedRevenue : null,
      };
    });

    return new Response(JSON.stringify({ monthlyRevenue: completeMonthlyRevenueData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
