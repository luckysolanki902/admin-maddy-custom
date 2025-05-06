// /components/analytics/main/AbandonedCartsChart.js

'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, Chip } from '@mui/material';
import dayjs from '@/lib/dayjsConfig';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const current = payload[0].payload;
  const value = current.abandonedCartsCount;

  // Calculate percentage change from previous day
  let percentChange = null;
  let dayOfWeekAverage = null;
  let vsAverage = null;
  let recovery = null;
  let weekComparison = null;
  let monthComparison = null;
  const dataArray = payload[0]?.payload?.dataArray;

  if (dataArray) {
    // Day over day change
    const currentIndex = dataArray.findIndex(item => item.originalDate === current.originalDate);
    if (currentIndex > 0) {
      const prevValue = dataArray[currentIndex - 1].abandonedCartsCount;
      if (prevValue > 0) {
        percentChange = ((value - prevValue) / prevValue) * 100;
      }
    }

    // Calculate day of week average (e.g., average for all Mondays)
    const date = dayjs(current.originalDate);
    const dayOfWeek = date.day(); // 0-6, where 0 is Sunday
    const sameWeekday = dataArray.filter(item => dayjs(item.originalDate).day() === dayOfWeek);
    if (sameWeekday.length > 1) {
      dayOfWeekAverage = sameWeekday.reduce((sum, item) => sum + item.abandonedCartsCount, 0) / sameWeekday.length;
      const weekdayComparison = ((value - dayOfWeekAverage) / dayOfWeekAverage) * 100;
      vsAverage = {
        day: date.format('dddd'),
        avg: dayOfWeekAverage,
        percentage: weekdayComparison
      };
    }
    
    // Calculate week-over-week comparison
    if (dataArray.length > 7 && currentIndex >= 7) {
      const lastWeekValue = dataArray[currentIndex - 7].abandonedCartsCount;
      if (lastWeekValue > 0) {
        weekComparison = {
          value: lastWeekValue,
          percentage: ((value - lastWeekValue) / lastWeekValue) * 100
        };
      }
    }
    
    // Calculate month-over-month comparison
    if (dataArray.length > 30 && currentIndex >= 30) {
      const lastMonthValue = dataArray[currentIndex - 30].abandonedCartsCount;
      if (lastMonthValue > 0) {
        monthComparison = {
          value: lastMonthValue,
          percentage: ((value - lastMonthValue) / lastMonthValue) * 100
        };
      }
    }

    // Recovery potential
    if (current.cartValue && value > 0) {
      recovery = {
        perCart: current.cartValue / value,
        potentialRecovery: current.cartValue * 0.4, // Assuming 40% potential recovery rate
        recoveryCarts: Math.round(value * 0.4) // Assuming 40% potential recovery rate
      };
    }
  }

  return (
    <Box
      sx={{
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(8px)',
        p: 2.5,
        borderRadius: '12px',
        border: '1px solid rgba(255, 114, 94, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        color: 'white',
        minWidth: 340,
        maxWidth: 400,
        position: 'relative',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, rgba(255, 128, 66, 0.2), rgba(255, 128, 66, 0.4), rgba(255, 128, 66, 0.2))',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }
      }}
    >
      {/* Header with date and key metric */}
      <Typography 
        variant="subtitle1" 
        sx={{ 
          mb: 1, 
          color: '#FFF',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          pb: 1
        }}
      >
        <span>{current.fullDate || label}</span>
        <Chip 
          label={`${value} carts`} 
          size="small"
          sx={{
            backgroundColor: 'rgba(255, 128, 66, 0.2)',
            color: '#FF8042',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        />
      </Typography>
      
      {/* Main analytics section */}
      <Box sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', p: 1.5, borderRadius: 1, mb: 2 }}>
        <Typography 
          variant="subtitle2" 
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mb: 0.5
          }}
        >
          Performance Analysis
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          {/* Daily comparison */}
          {percentChange !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#EEE', fontSize: '0.85rem' }}>
                vs Previous Day
              </Typography>
              <Chip
                label={`${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`}
                size="small"
                sx={{
                  backgroundColor: percentChange < 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)',
                  color: percentChange < 0 ? '#34D399' : '#F472B6',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24
                }}
              />
            </Box>
          )}
          
          {/* Day of week average */}
          {vsAverage && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#EEE', fontSize: '0.85rem' }}>
                vs Avg {vsAverage.day} ({Math.round(vsAverage.avg)})
              </Typography>
              <Chip
                label={`${vsAverage.percentage > 0 ? '+' : ''}${vsAverage.percentage.toFixed(1)}%`}
                size="small"
                sx={{
                  backgroundColor: vsAverage.percentage < 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)',
                  color: vsAverage.percentage < 0 ? '#34D399' : '#F472B6',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24
                }}
              />
            </Box>
          )}
          
          {/* Week over week comparison */}
          {weekComparison && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#EEE', fontSize: '0.85rem' }}>
                vs Last Week ({weekComparison.value})
              </Typography>
              <Chip
                label={`${weekComparison.percentage > 0 ? '+' : ''}${weekComparison.percentage.toFixed(1)}%`}
                size="small"
                sx={{
                  backgroundColor: weekComparison.percentage < 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)',
                  color: weekComparison.percentage < 0 ? '#34D399' : '#F472B6',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24
                }}
              />
            </Box>
          )}
          
          {/* Month over month comparison */}
          {monthComparison && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#EEE', fontSize: '0.85rem' }}>
                vs Last Month ({monthComparison.value})
              </Typography>
              <Chip
                label={`${monthComparison.percentage > 0 ? '+' : ''}${monthComparison.percentage.toFixed(1)}%`}
                size="small"
                sx={{
                  backgroundColor: monthComparison.percentage < 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)',
                  color: monthComparison.percentage < 0 ? '#34D399' : '#F472B6',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Revenue impact section */}
      {current.cartValue !== undefined && (
        <Box 
          sx={{ 
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            background: 'linear-gradient(135deg, rgba(255, 128, 66, 0.15) 0%, rgba(255, 128, 66, 0.05) 100%)',
            border: '1px solid rgba(255, 128, 66, 0.1)',
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 0.5
            }}
          >
            Revenue Impact
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#EEE', fontSize: '0.85rem' }}>
                Unrealized Revenue
              </Typography>
              <Typography variant="h6" sx={{ color: '#FF8042', fontWeight: 600, fontSize: '1.1rem' }}>
                ₹{typeof current.cartValue === 'number' ? 
                  current.cartValue.toLocaleString('en-IN') : 
                  'N/A'}
              </Typography>
            </Box>
            
            {recovery && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#EEE', fontSize: '0.85rem' }}>
                  Avg. Cart Value
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>
                  ₹{Math.round(recovery.perCart).toLocaleString('en-IN')}
                </Typography>
              </Box>
            )}
            
            {/* Recovery potential stats */}
            {recovery && (
              <Box sx={{ 
                mt: 1, 
                pt: 1, 
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#34D399',
                      display: 'block',
                      fontSize: '0.75rem',
                      mb: 0.25
                    }}
                  >
                    Recovery Potential
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#FFF',
                      fontSize: '0.95rem',
                      fontWeight: 600
                    }}
                  >
                    ₹{Math.round(recovery.potentialRecovery).toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#34D399',
                      display: 'block',
                      fontSize: '0.75rem',
                      mb: 0.25
                    }}
                  >
                    Recoverable Carts
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#FFF',
                      fontSize: '0.95rem',
                      fontWeight: 600
                    }}
                  >
                    {recovery.recoveryCarts} carts
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
      
      {/* Customer analysis section */}
      {current.customerInsight && (
        <Box 
          sx={{ 
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(96, 165, 250, 0.05) 100%)',
            border: '1px solid rgba(96, 165, 250, 0.1)',
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 0.5
            }}
          >
            Customer Analysis
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#EEE',
              fontSize: '0.85rem',
              mt: 1
            }}
          >
            {current.customerInsight}
          </Typography>
        </Box>
      )}
      
      {/* Intelligent Insights */}
      <Box sx={{ pb: 0.5 }}>
        <Typography 
          variant="subtitle2" 
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mb: 0.5
          }}
        >
          Key Insight
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#FFF',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            fontWeight: 500
          }}
        >
          {(percentChange && percentChange > 20) ? (
            <>
              <Box component="span" sx={{ color: '#F472B6', fontWeight: 600 }}>
                {Math.abs(Math.round(percentChange))}% increase
              </Box> from previous day, significantly above historical patterns. High correlation with {vsAverage && vsAverage.day} traffic spikes.
            </>
          ) : (percentChange && percentChange < -20) ? (
            <>
              <Box component="span" sx={{ color: '#34D399', fontWeight: 600 }}>
                {Math.abs(Math.round(percentChange))}% decrease
              </Box> compared to previous day, showing better conversion efficiency than average {vsAverage ? `${vsAverage.day}s` : 'days'}.
            </>
          ) : (recovery && recovery.potentialRecovery > 10000) ? (
            <>
              High-value abandonment pattern detected with <Box component="span" sx={{ color: '#FF8042', fontWeight: 600 }}>
                ₹{Math.round(recovery.perCart).toLocaleString('en-IN')}
              </Box> per cart, {Math.round((recovery.perCart / dataArray?.reduce((sum, i) => sum + (i.cartValue || 0) / i.abandonedCartsCount, 0) * dataArray?.length) * 100 - 100)}% above average.
            </>
          ) : (value > (dataArray?.reduce((sum, i) => sum + i.abandonedCartsCount, 0) / dataArray?.length * 1.5)) ? (
            <>
              Statistically significant <Box component="span" sx={{ color: '#F472B6', fontWeight: 600 }}>
                {Math.round((value / (dataArray?.reduce((sum, i) => sum + i.abandonedCartsCount, 0) / dataArray?.length) * 100) - 100)}% higher
              </Box> than period average, suggesting checkout friction during peak traffic periods.
            </>
          ) : (weekComparison && Math.abs(weekComparison.percentage) > 15) ? (
            <>
              <Box component="span" sx={{ color: weekComparison.percentage < 0 ? '#34D399' : '#F472B6', fontWeight: 600 }}>
                {Math.abs(Math.round(weekComparison.percentage))}% {weekComparison.percentage < 0 ? 'lower' : 'higher'}
              </Box> than same day last week, reflecting {weekComparison.percentage < 0 ? 'improved checkout experience' : 'increased abandonment patterns'}.
            </>
          ) : (
            <>
              Within normal fluctuation range (<Box component="span" sx={{ color: '#60A5FA', fontWeight: 600 }}>±{Math.round((value / (dataArray?.reduce((sum, i) => sum + i.abandonedCartsCount, 0) / dataArray?.length) * 100) - 100)}%</Box> from average). Consistent with historical {vsAverage ? vsAverage.day : 'daily'} patterns.
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
};

const AbandonedCartsChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const enrichedData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    const startDate = dayjs(sortedData[0]?.date);
    const endDate = dayjs(sortedData[sortedData.length - 1]?.date);
    const totalDays = endDate.diff(startDate, 'days') + 1;
    const dataLength = sortedData.length;

    const shouldGroupByWeek = totalDays > 14 || dataLength > 10;
    
    let weekMap = {};
    if (shouldGroupByWeek) {
      sortedData.forEach((item) => {
        const date = dayjs(item.date);
        const weekStart = date.startOf('week').format('YYYY-MM-DD');
        
        if (!weekMap[weekStart]) {
          weekMap[weekStart] = {
            weekStart,
            weekLabel: `${date.format('MMM D')} - ${date.endOf('week').format('D')}`,
            count: 0,
            value: 0,
            items: []
          };
        }
        
        weekMap[weekStart].count += item.abandonedCartsCount;
        weekMap[weekStart].value += item.cartValue || 0;
        weekMap[weekStart].items.push(item);
      });
    }
    
    return sortedData.map((item, index) => {
      const date = dayjs(item.date);
      let displayDate;
      let displayGroup;
      
      if (shouldGroupByWeek) {
        const weekStart = date.startOf('week').format('YYYY-MM-DD');
        const isFirstInWeek = index === 0 || 
          date.startOf('week').diff(dayjs(sortedData[index-1].date).startOf('week'), 'day') !== 0;
          
        if (isFirstInWeek) {
          displayDate = `W${date.week()}`;
          displayGroup = weekMap[weekStart].weekLabel;
        } else {
          displayDate = '';
        }
      } else if (dataLength <= 7) {
        displayDate = date.format('ddd, D');
      } else {
        displayDate = index % 2 === 0 ? date.format('MMM D') : '';
      }
      
      return {
        ...item,
        originalDate: item.date,
        date: displayDate,
        fullDate: date.format('MMM D, YYYY'),
        displayGroup,
        dataArray: sortedData
      };
    });
  }, [data]);
  
  const totalCarts = useMemo(() => 
    data.reduce((sum, item) => sum + item.abandonedCartsCount, 0),
    [data]
  );
  
  const avgCartsPerDay = useMemo(() => 
    data.length > 0 ? Math.round(totalCarts / data.length) : 0,
    [data, totalCarts]
  );
  
  const maxCartsDay = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, item) => 
      item.abandonedCartsCount > max.abandonedCartsCount ? item : max, 
      data[0]
    );
  }, [data]);
  
  const totalRevenueLoss = useMemo(() => 
    data.reduce((sum, item) => sum + (item.cartValue || 0), 0),
    [data]
  );

  const averageLineValue = useMemo(() => avgCartsPerDay, [avgCartsPerDay]);
  
  return (
    <Box
      sx={{
        width: '100%',
        background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
        p: 4,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        minHeight: 450
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Typography
          variant="h6"
          sx={{ 
            color: 'white', 
            fontWeight: 600,
            fontSize: isSmallScreen ? '1.1rem' : '1.25rem'
          }}
        >
          Abandoned Carts Over Time
        </Typography>
        
        <Box
          sx={{
            backgroundColor: 'rgba(255, 128, 66, 0.15)',
            borderRadius: '10px',
            padding: '8px 15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Total Carts
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#FF8042', fontWeight: 'bold' }}>
            {totalCarts}
          </Typography>
        </Box>
      </Box>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart 
          data={enrichedData}
          margin={{ 
            top: 10, 
            right: 20, 
            left: isSmallScreen ? 5 : 15, 
            bottom: isSmallScreen ? 20 : 10
          }}
        >
          <defs>
            <linearGradient id="colorAbandoned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF8042" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#FF8042" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255, 255, 255, 0.1)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#AAA"
            tick={(props) => {
              const { x, y, payload } = props;
              if (!payload.value) return null;
              
              const item = payload.payload;
              const isWeekLabel = payload.value.startsWith('W');
              
              return (
                <g>
                  {isWeekLabel && item && item.displayGroup && (
                    <text 
                      x={x} 
                      y={y + 10} 
                      textAnchor="middle" 
                      fill="#EEE"
                      fontSize={isSmallScreen ? 10 : 12}
                      fontWeight="500"
                    >
                      {item.displayGroup}
                    </text>
                  )}
                  {!isWeekLabel && (
                    <text 
                      x={x} 
                      y={y + 10} 
                      textAnchor="middle" 
                      fill="#EEE"
                      fontSize={isSmallScreen ? 10 : 12}
                    >
                      {payload.value}
                    </text>
                  )}
                </g>
              );
            }}
            axisLine={{ strokeWidth: 0.5 }}
            tickLine={false}
          />
          <YAxis 
            stroke="#AAA" 
            tick={{ fill: '#EEE' }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine 
            y={averageLineValue} 
            stroke="rgba(255, 255, 255, 0.5)" 
            strokeDasharray="3 3" 
            label={{ 
              value: 'Avg', 
              position: 'right',
              fill: '#EEE',
              fontSize: 12
            }} 
          />
          <Area
            type="monotone"
            dataKey="abandonedCartsCount"
            stroke="#FF8042"
            fill="url(#colorAbandoned)"
            fillOpacity={1}
            strokeWidth={2}
            activeDot={{ 
              r: 6, 
              strokeWidth: 1,
              stroke: '#FFF'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'grid',
          gridTemplateColumns: isSmallScreen ? '1fr' : 'repeat(3, 1fr)',
          gap: 2
        }}
      >
        <Box sx={{ textAlign: 'center', p: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Average Per Day
          </Typography>
          <Typography variant="h6" sx={{ color: '#FF8042', fontWeight: 'bold' }}>
            {avgCartsPerDay}
          </Typography>
        </Box>
        
        {maxCartsDay && (
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Peak Day
            </Typography>
            <Typography variant="h6" sx={{ color: '#FF8042', fontWeight: 'bold' }}>
              {dayjs(maxCartsDay.date).format('MMM D')} ({maxCartsDay.abandonedCartsCount})
            </Typography>
          </Box>
        )}
        
        {totalRevenueLoss > 0 && (
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Est. Revenue Loss
            </Typography>
            <Typography variant="h6" sx={{ color: '#FF8042', fontWeight: 'bold' }}>
              ₹{totalRevenueLoss.toLocaleString('en-IN')}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(AbandonedCartsChart);
