// /components/analytics/main/RetargetedCustomersChart.js

'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  ButtonGroup,
  Button,
  Fade
} from '@mui/material';
import dayjs from '@/lib/dayjsConfig';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const { sentCount, purchasedCount, campaigns } = payload[0].payload;

  return (
    <Box
      sx={{
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(8px)',
        p: 2.5,
        borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        color: 'white',
        minWidth: 240,
        position: 'relative',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.2))',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }
      }}
    >
      <Typography 
        variant="subtitle2" 
        sx={{ 
          mb: 1.5, 
          color: '#FFF',
          fontSize: '0.95rem',
          fontWeight: 600,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          pb: 1
        }}
      >
        {label}
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1,
          p: 0.8,
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#A78BFA',
              mr: 1.5,
              boxShadow: '0 0 10px #A78BFA40'
            }}
          />
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              color: '#EEE'
            }}
          >
            Emails Sent
          </Typography>
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#FFF'
          }}
        >
          {sentCount}
        </Typography>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          p: 0.8,
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#34D399',
              mr: 1.5,
              boxShadow: '0 0 10px #34D39940'
            }}
          />
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              color: '#EEE'
            }}
          >
            Purchased
          </Typography>
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#FFF'
          }}
        >
          {purchasedCount}
        </Typography>
      </Box>
      
      <Box
        sx={{
          mt: 1.5,
          pt: 1.5,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#CCC',
            fontSize: '0.85rem',
            fontWeight: 600,
            mb: 1
          }}
        >
          Campaign Breakdown:
        </Typography>
        
        {campaigns.map((c) => (
          <Box 
            key={c.campaignName}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 0.8,
              pl: 1,
              pr: 1,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.04)'
              }
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.8rem',
                color: '#EEE',
                maxWidth: '70%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {c.campaignName}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.8rem',
                color: '#CCC'
              }}
            >
              {c.purchasedCount}/{c.sentCount}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const RetargetedCustomersChart = ({ data }) => {
  const [showSent, setShowSent] = useState(true);
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // Process data for cleaner x-axis labels
  const processedData = useMemo(() => {
    // First, sort data by date
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    
    // Extract date information
    return sortedData.map((entry) => {
      const date = dayjs(entry.date);
      
      // Create custom display formats for different date intervals
      let displayDate;
      
      // If we have more than 10 data points, condense the labels
      if (sortedData.length > 10) {
        if (date.date() === 1 || date.date() === 15) {
          // Show only 1st and 15th of each month when we have many points
          displayDate = date.format('MMM D');
        } else {
          // For other dates, check if it's Monday (for weekly representation)
          if (date.day() === 1) { // Monday
            displayDate = date.format('DD');
          } else {
            displayDate = '';  // Empty string for dates we want to hide
          }
        }
      } else {
        // For fewer points, show all dates in a nice format
        displayDate = date.format('MMM D');
      }
      
      return {
        ...entry,
        originalDate: entry.date, // Keep original for tooltip
        date: displayDate, // Replace with our display format
        fullDate: date.format('MMM D, YYYY'),
      };
    });
  }, [data]);

  // find the maxima
  const maxPurchased = data.reduce(
    (mx, d) => Math.max(mx, d.purchasedCount),
    0
  );
  const maxSent = data.reduce(
    (mx, d) => Math.max(mx, d.sentCount),
    0
  );
  const overallMax = Math.max(maxSent, maxPurchased);

  // choose Y-axis max based on toggle
  const yMaxRaw = showSent ? overallMax : maxPurchased;
  const yMax = yMaxRaw < 10
    ? 10
    : Math.ceil(yMaxRaw / 10) * 10;

  return (
    <Box sx={{
      width: '100%',
      background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
      p: 4,
      borderRadius: 3,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      minHeight: 450
    }}>
      {/* Header with creative UI instead of toggle switch */}
      <Box
        display="flex"
        flexDirection="column"
        mb={3}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'white', 
            fontWeight: 600, 
            mb: 2,
            fontSize: isSmall ? '1.1rem' : '1.25rem'
          }}
        >
          Retargeted Customers (Daily)
        </Typography>
        
        <ButtonGroup 
          variant="outlined" 
          size="small" 
          sx={{ 
            alignSelf: 'flex-start',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '2px',
            '& .MuiButtonGroup-grouped': {
              border: 'none',
              borderRadius: '6px !important',
              mx: 0.2
            }
          }}
        >
          <Button 
            onClick={() => setShowSent(true)}
            sx={{ 
              color: showSent ? '#FFF' : 'rgba(255, 255, 255, 0.5)', 
              backgroundColor: showSent ? 'rgba(99, 102, 241, 0.8)' : 'transparent',
              minWidth: '130px',
              '&:hover': {
                backgroundColor: showSent ? 'rgba(99, 102, 241, 0.85)' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            All Data
          </Button>
          <Button 
            onClick={() => setShowSent(false)}
            sx={{ 
              color: !showSent ? '#FFF' : 'rgba(255, 255, 255, 0.5)', 
              backgroundColor: !showSent ? 'rgba(52, 211, 153, 0.8)' : 'transparent',
              minWidth: '130px',
              '&:hover': {
                backgroundColor: !showSent ? 'rgba(52, 211, 153, 0.85)' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Purchases Only
          </Button>
        </ButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={330}>
        <AreaChart
          data={processedData}
          margin={{ top: 10, right: 20, bottom: isSmall ? 30 : 20, left: 10 }}
        >
          <defs>
            <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="purchasedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34D399" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#AAA"
            tick={props => {
              const { x, y, payload } = props;
              // Only render ticks that have a display value
              if (!payload.value) return null;
              
              return (
                <text 
                  x={x} 
                  y={y + 10} 
                  textAnchor="middle" 
                  fill="#EEE"
                  fontSize={isSmall ? 11 : 13}
                >
                  {payload.value}
                </text>
              );
            }}
            axisLine={{ strokeWidth: 0.5 }}
            tickLine={false}
          />
          <YAxis
            stroke="#AAA"
            tick={{ fill: '#EEE', fontSize: 12 }}
            domain={[0, yMax]}
            axisLine={{ strokeWidth: 0.5 }}
            tickLine={false}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            labelFormatter={(label, entries) => {
              // Use the full date from the data point for the tooltip
              const dataPoint = entries[0]?.payload;
              return dataPoint?.fullDate || label;
            }}
          />
          
          {/* Show sent count area only when showSent is true */}
          {showSent && (
            <Area
              type="monotone"
              dataKey="sentCount"
              name="Emails Sent"
              stroke="#A78BFA"
              fill="url(#sentGradient)"
              fillOpacity={1}
              strokeWidth={2}
              activeDot={{ r: 6, strokeWidth: 1, stroke: '#FFF' }}
            />
          )}
          
          <Area
            type="monotone"
            dataKey="purchasedCount"
            name="Purchases"
            stroke="#34D399"
            fill="url(#purchasedGradient)"
            fillOpacity={1}
            strokeWidth={2}
            activeDot={{ r: 6, strokeWidth: 1, stroke: '#FFF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          mt: 2,
          pt: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Total Sent
          </Typography>
          <Typography variant="h6" sx={{ color: '#A78BFA', fontWeight: 'bold' }}>
            {data.reduce((sum, item) => sum + item.sentCount, 0).toLocaleString()}
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Total Purchases
          </Typography>
          <Typography variant="h6" sx={{ color: '#34D399', fontWeight: 'bold' }}>
            {data.reduce((sum, item) => sum + item.purchasedCount, 0).toLocaleString()}
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Conversion Rate
          </Typography>
          <Typography variant="h6" sx={{ color: '#F472B6', fontWeight: 'bold' }}>
            {(data.reduce((sum, item) => sum + item.purchasedCount, 0) / 
              Math.max(1, data.reduce((sum, item) => sum + item.sentCount, 0)) * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(RetargetedCustomersChart);
