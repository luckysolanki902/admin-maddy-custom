// ReturningPayingUsersChart.jsx

import React, { useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from '@/lib/dayjsConfig'; // Centralized Day.js import

const COLORS = ['#2D7EE8'];

const ReturningPayingUsersChart = ({ data, startDate, endDate }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Determine if the date range is valid
  const isValidDateRange = startDate && endDate;

  // Calculate the difference in days using Math.ceil to align with the backend
  const daysDifference = isValidDateRange
    ? Math.ceil(dayjs(endDate).diff(dayjs(startDate), 'millisecond') / (1000 * 60 * 60 * 24))
    : null;

  // Log the received data for debugging
  useEffect(() => {
    console.log('Received data in ReturningPayingUsersChart:', data);
  }, [data]);

  // Format period labels based on the date range and period format
  const formatPeriodLabel = (period) => {
    console.log('Debug period:', period); // Debugging line

    if (!period) {
      return 'No Date';
    }

    try {
      if (isValidDateRange) {
        if (daysDifference < 7) {
          // Daily data (format: YYYY-MM-DD)
          const parsedDate = dayjs(period, 'YYYY-MM-DD', true); // Strict parsing
          if (parsedDate.isValid()) {
            return parsedDate.format('MMM D');
          } else {
            // Attempt fallback parsing without strict mode
            const fallback = dayjs(period);
            return fallback.isValid() ? fallback.format('MMM D') : 'Invalid Date';
          }
        } else {
          // Weekly data (format: YYYY-WW)
          const [year, week] = period.split('-W');
          if (!year || !week) {
            return 'Invalid Week';
          }

          const weekNumber = parseInt(week, 10);
          if (isNaN(weekNumber)) {
            return 'Invalid Week Number';
          }

          const startOfWeek = dayjs()
            .year(year)
            .isoWeek(weekNumber)
            .startOf('isoWeek')
            .format('MMM D');
          const endOfWeek = dayjs()
            .year(year)
            .isoWeek(weekNumber)
            .endOf('isoWeek')
            .format('MMM D');

          return `${startOfWeek} - ${endOfWeek}`;
        }
      } else {
        // 'All' tag: Monthly data (format: YYYY-MM)
        const parsedMonth = dayjs(period, 'YYYY-MM', true); // Strict parsing
        if (parsedMonth.isValid()) {
          return parsedMonth.format('MMM YYYY');
        } else {
          // Attempt fallback parsing without strict mode
          const fallback = dayjs(period);
          return fallback.isValid() ? fallback.format('MMM YYYY') : 'Invalid Month';
        }
      }
    } catch (error) {
      console.error('Error formatting period label:', error);
      return 'Invalid Date';
    }
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const formattedLabel = formatPeriodLabel(label);
      const value = payload[0].value;
      return (
        <Box
          sx={{
            backgroundColor: '#333',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: 'white',
          }}
        >
          <Typography variant="body2">{formattedLabel}</Typography>
          <Typography variant="body1">{`${value} Users`}</Typography>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#2C2C2C',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: 3,
        transition: 'transform 0.3s',
        position: 'relative',
        minHeight: 450,
      }}
    >
      {/* Chart Title and Total Users */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          // onClick={() => {
          //   // Navigate to detailed page
          //   window.location.href = 'admin/analytics/returning-paying-users';
          // }}
        >
          Users Re-ordering Over Time
        </Typography>

        {/* Total Returning Paying Users Chip */}
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: isSmallScreen ? '0.85rem' : '1rem',
            backgroundColor: 'rgb(50, 50, 50)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
          }}
        >
          Total: {data.reduce((acc, item) => acc + item.returningPayingUsersCount, 0)}
        </Typography>
      </Box>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis
            dataKey="period"
            stroke="#fff"
            tickFormatter={(label) => formatPeriodLabel(label)}
            interval={isSmallScreen ? 'preserveStartEnd' : 0}
          />
          <YAxis
            stroke="#fff"
            allowDecimals={false}
            label={{
              value: 'Returning Paying Users',
              angle: -90,
              position: 'insideLeft',
              fill: 'white',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="returningPayingUsersCount"
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(ReturningPayingUsersChart);
