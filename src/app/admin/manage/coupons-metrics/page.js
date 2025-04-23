'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Skeleton,
  Stack,
  TextField,
  Paper,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import dayjs from 'dayjs';

import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';

export default function CouponStatsPage() {
  const [activeTag, setActiveTag] = useState('last7days');
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(6, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCoupons, setSelectedCoupons] = useState([]);
  const [customDate, setCustomDate] = useState(dayjs());

  // Palette for bars/lines
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#413ea0'];

  // Fetch stats
  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (dateRange.start && dateRange.end) {
      qs.set('startDate', dateRange.start.toISOString());
      qs.set('endDate', dateRange.end.toISOString());
    }
    fetch(`/api/admin/analytics/coupon-metrics?${qs}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setSelectedCoupons(json.byCoupon.map((c) => c.couponCode));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange]);

  // Toggle coupon in selection
  const toggleCoupon = (code) => {
    setSelectedCoupons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Filtered data for bar chart
  const barData = useMemo(
    () =>
      data?.byCoupon.filter((c) =>
        selectedCoupons.includes(c.couponCode)
      ) || [],
    [data, selectedCoupons]
  );

  // Transform dailyUsage for line chart
  const lineData = useMemo(() => {
    if (!data) return [];
    return data.dailyUsage
      .map((entry) => ({ date: entry.date, ...entry.counts }))
      .filter((entry) =>
        selectedCoupons.some((code) => entry[code] !== undefined)
      );
  }, [data, selectedCoupons]);

  // Custom Tooltip for BarChart
  const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const { usageCount, totalDiscount } = payload[0].payload;
      return (
        <Paper sx={{ p: 1 }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="body2">Uses: {usageCount}</Typography>
          <Typography variant="body2">
            Total Discount: ₹{totalDiscount.toLocaleString('en-IN')}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // DateRangeChips handlers
  const handleAllTagClick = () => {
    setActiveTag('all');
    setDateRange({ start: dayjs('2021-04-06').startOf('day'), end: dayjs().endOf('day') });
  };

  const handleCustomDayChange = (date) => {
    if (date && date.isValid()) {
      setCustomDate(date);
      setActiveTag('custom');
      setDateRange({ start: date.startOf('day'), end: date.endOf('day') });
    }
  };

  const handleMonthSelection = (tag) => {
    let start, end;
    if (tag === 'thisMonth') {
      start = dayjs().startOf('month');
      end = dayjs().endOf('month');
    } else {
      start = dayjs().subtract(1, 'month').startOf('month');
      end = dayjs().subtract(1, 'month').endOf('month');
    }
    setActiveTag(tag);
    setDateRange({ start, end });
  };

  return (
    <Box p={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography
        variant="h3"
        align="center"
        gutterBottom
        sx={{ fontWeight: 'bold' }}
      >
        Coupon Usage Dashboard
      </Typography>
      <Typography
        variant="body1"
        align="left"
        sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}
      >
        *Only coupons after 6 April 2021 are shown here
      </Typography>

      <DateRangeChips
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        setDateRange={setDateRange}
        handleAllTagClick={handleAllTagClick}
        handleCustomDayChange={handleCustomDayChange}
        handleCustomDateChange={null}
        handleMonthSelection={handleMonthSelection}
      />

      {activeTag === 'custom' && (
        <DatePicker
          label="Pick a day"
          value={customDate}
          onChange={handleCustomDayChange}
          minDate={dayjs('2021-04-06')}
          renderInput={(params) => (
            <TextField {...params} sx={{ mt: 2 }} fullWidth />
          )}
        />
      )}

      {/* Summary cards */}
      <Grid container spacing={2} mt={3}>
        {[
          { label: 'Uses', value: data?.overall.usageCount || 0 },
          {
            label: 'Total Discount',
            value: data?.overall.totalDiscount || 0,
            isCurrency: true,
          },
          {
            label: 'Avg. Discount',
            value: data?.overall.averageDiscount || 0,
            isCurrency: true,
          },
        ].map(({ label, value, isCurrency }) => (
          <Grid item xs={12} sm={4} key={label}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {label}
                </Typography>
                {loading ? (
                  <Skeleton variant="text" width={80} height={50} />
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {isCurrency
                      ? value.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })
                      : value}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Coupon selector chips */}
      <Box mt={4}>
        <Typography variant="h6">Select Coupons:</Typography>
        <Stack direction="row" flexWrap="wrap" spacing={1} mt={1}>
          {data?.byCoupon.map((c) => (
            <Chip
              key={c.couponCode}
              label={c.couponCode}
              onClick={() => toggleCoupon(c.couponCode)}
              color={
                selectedCoupons.includes(c.couponCode)
                  ? 'primary'
                  : 'default'
              }
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </Box>

      {/* Bar chart: usage comparison */}
      <Box mt={5} sx={{ height: 300 }}>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height={300} />
        ) : (
          <ResponsiveContainer>
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="couponCode" />
              <YAxis />
              <ReTooltip content={<BarTooltip />} />
              <Legend />
              <Bar dataKey="usageCount" name="Uses">
                {barData.map((_, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={colors[idx % colors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Line chart: usage count over time */}
      <Box mt={5} sx={{ height: 300 }}>
        <Typography variant="h6" gutterBottom>
          Usage Count Over Time
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height={300} />
        ) : (
          <ResponsiveContainer>
            <LineChart
              data={lineData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => dayjs(d).format('MM-DD')}
              />
              <YAxis />
              <ReTooltip
                labelFormatter={(d) => dayjs(d).format('MMM D, YYYY')}
              />
              <Legend />
              {selectedCoupons.map((code, idx) => (
                <Line
                  key={code}
                  type="monotone"
                  dataKey={code}
                  name={code}
                  stroke={colors[idx % colors.length]}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
}