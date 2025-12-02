// components/analytics/user-behavior/FirstCategoryRepeatChart.js
'use client';

import { useMemo, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, useTheme, alpha, Chip, 
  Tooltip, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Collapse
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function FirstCategoryRepeatChart({ data }) {
  const theme = useTheme();
  const [showTable, setShowTable] = useState(false);

  const chartData = useMemo(() => {
    if (!data?.firstCategoryRepeat?.categories) return [];
    
    // Get top 10 categories for the chart
    return data.firstCategoryRepeat.categories
      .slice(0, 10)
      .map((cat, idx) => ({
        ...cat,
        shortName: cat.categoryName.length > 18 
          ? cat.categoryName.substring(0, 18) + '...' 
          : cat.categoryName,
        fill: idx === 0 
          ? theme.palette.warning.main 
          : idx < 3 
            ? theme.palette.primary.main 
            : alpha(theme.palette.primary.main, 0.7)
      }));
  }, [data, theme]);

  const pieData = useMemo(() => {
    if (!data?.firstCategoryRepeat?.categories) return [];
    
    // Top 5 for pie chart
    const top5 = data.firstCategoryRepeat.categories.slice(0, 5);
    const othersCount = data.firstCategoryRepeat.categories
      .slice(5)
      .reduce((sum, cat) => sum + cat.repeatCustomerCount, 0);
    
    const result = top5.map((cat, idx) => ({
      name: cat.categoryName.length > 15 ? cat.categoryName.substring(0, 15) + '...' : cat.categoryName,
      fullName: cat.categoryName,
      value: cat.repeatCustomerCount,
      fill: [
        theme.palette.warning.main,
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.info.main,
        theme.palette.success.main
      ][idx]
    }));
    
    if (othersCount > 0) {
      result.push({
        name: 'Others',
        fullName: 'Other Categories',
        value: othersCount,
        fill: alpha(theme.palette.text.secondary, 0.5)
      });
    }
    
    return result;
  }, [data, theme]);

  const summary = data?.firstCategoryRepeat?.summary;
  const allCategories = data?.firstCategoryRepeat?.categories || [];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 220,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {item.categoryName || item.fullName}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Repeat Customers:</Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.main">
              {item.repeatCustomerCount || item.value}
            </Typography>
          </Box>
          {item.avgSubsequentOrders && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">Avg Orders After:</Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main">
                {item.avgSubsequentOrders}
              </Typography>
            </Box>
          )}
        </Box>
        {item.sampleProducts && item.sampleProducts.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Sample Products:
            </Typography>
            {item.sampleProducts.slice(0, 2).map((p, i) => (
              <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                • {p.name}
              </Typography>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  if (!data || !summary) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No first category repeat data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <StarIcon sx={{ color: theme.palette.warning.main, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            First Purchase Category → Repeat Customers
          </Typography>
          <Chip
            label="Loyalty Driver"
            size="small"
            sx={{
              ml: 0.5,
              height: 20,
              fontSize: '0.65rem',
              background: alpha(theme.palette.warning.main, 0.12),
              color: theme.palette.warning.main,
              fontWeight: 700,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
          Which category&apos;s first purchase best converts customers into repeat buyers? 
          Shows categories that drive loyalty when bought first.
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.warning.main, 0.08),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Repeat Customers
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main, fontSize: '1.3rem' }}>
              {summary.totalRepeatCustomers}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <CategoryIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Categories
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main, fontSize: '1.3rem' }}>
              {summary.totalCategories}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <EmojiEventsIcon sx={{ fontSize: 14, color: theme.palette.success.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Top Category Share
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main, fontSize: '1.3rem' }}>
              {summary.topCategoryShare}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Category Highlight */}
      {summary.topCategory && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.12)} 0%, ${alpha(theme.palette.warning.main, 0.04)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <EmojiEventsIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
              🏆 Best Loyalty Driver
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {summary.topCategory.categoryName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {summary.topCategory.repeatCustomerCount} customers who first bought this category came back to purchase again, 
            averaging {summary.topCategory.avgSubsequentOrders} additional orders each.
          </Typography>
        </Paper>
      )}

      {/* Charts Grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Bar Chart */}
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.8rem' }}>
            Top Categories by Repeat Customer Count
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={alpha(theme.palette.divider, 0.08)} 
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                type="number" 
                stroke={theme.palette.text.secondary}
                style={{ fontSize: '0.7rem' }}
              />
              <YAxis 
                type="category" 
                dataKey="shortName" 
                width={120}
                stroke={theme.palette.text.secondary}
                style={{ fontSize: '0.65rem' }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="repeatCustomerCount" 
                radius={[0, 6, 6, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.8rem' }}>
            Distribution (Top 5)
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
      </Grid>

      {/* Expandable Table */}
      <Box sx={{ mt: 2 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            p: 1,
            borderRadius: 1,
            '&:hover': { background: alpha(theme.palette.primary.main, 0.05) }
          }}
          onClick={() => setShowTable(!showTable)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
            All Categories ({allCategories.length})
          </Typography>
          <IconButton size="small">
            {showTable ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Collapse in={showTable}>
          <TableContainer component={Paper} elevation={0} sx={{ 
            mt: 1, 
            maxHeight: 300,
            background: alpha(theme.palette.background.paper, 0.5),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Repeat Customers</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Avg Orders After</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allCategories.map((cat, idx) => (
                  <TableRow key={cat.categoryId} hover>
                    <TableCell sx={{ fontSize: '0.7rem' }}>
                      {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>
                      <Tooltip title={cat.categoryCode || ''}>
                        <span>{cat.categoryName}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                      {cat.repeatCustomerCount}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.7rem', color: theme.palette.success.main }}>
                      {cat.avgSubsequentOrders}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>
      </Box>

      {/* Info Box */}
      <Box sx={{ 
        mt: 2, 
        p: 1.5, 
        background: alpha(theme.palette.info.main, 0.05), 
        borderRadius: 1.5, 
        border: `1px solid ${alpha(theme.palette.info.main, 0.15)}` 
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          💡 <strong>How to read:</strong> This shows which product category, when purchased first by a customer, 
          led to the highest number of repeat purchases. Categories at the top are your &quot;gateway products&quot; that 
          build customer loyalty and drive return visits.
        </Typography>
      </Box>
    </Box>
  );
}
