"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Rating,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Fade,
  Slide,
  alpha,
  useTheme,
  useMediaQuery,
  Button,
  Pagination,
  Grid,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import { departmentAdmins } from "@/lib/constants/user";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import TimerIcon from "@mui/icons-material/Timer";
import PersonIcon from "@mui/icons-material/Person";
import DownloadIcon from "@mui/icons-material/Download";
import BarChartIcon from "@mui/icons-material/BarChart";

export default function ProductivityOverview() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Date range state - Default to Today
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('day'),
    end: dayjs().endOf('day')
  });
  const [activeTag, setActiveTag] = useState('today');
  
  // Data state with proper initialization
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // Filter state
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  const departments = Object.keys(departmentAdmins);

  // Create stable references for dependencies
  const startDate = dateRange.start.format("YYYY-MM-DD");
  const endDate = dateRange.end.format("YYYY-MM-DD");
  const selectedDeptsStr = selectedDepts.join(',');
  const allDepartmentsStr = departments.join(',');

  // Effect for initial load and filter changes with debounce
  useEffect(() => {
    
    const timeoutId = setTimeout(() => {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        
        try {
          const params = new URLSearchParams({
            startDate,
            endDate,
            page: "1",
            limit: "10",
            departments: selectedDepts.length > 0 ? selectedDeptsStr : allDepartmentsStr
          });


          const res = await fetch(`/api/productivity/range?${params}`, {
            method: "GET",
            credentials: "include",
          });
          
          if (res.ok) {
            const data = await res.json();
            setSubmissions(data.submissions || []);
            setPagination({
              currentPage: 1,
              itemsPerPage: 10,
              totalItems: data.totalCount || 0,
              totalPages: Math.ceil((data.totalCount || 0) / 10)
            });
          } else {
            console.error('Failed to fetch submissions:', res.status, res.statusText);
            setError('Failed to fetch submissions');
            setSubmissions([]);
            setPagination({
              currentPage: 1,
              itemsPerPage: 10,
              totalItems: 0,
              totalPages: 1
            });
          }
        } catch (err) {
          console.error('Error fetching submissions:', err);
          setError('Error fetching submissions');
          setSubmissions([]);
          setPagination({
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            totalPages: 1
          });
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [startDate, endDate, selectedDeptsStr, allDepartmentsStr, selectedDepts.length]);

  // Handle date range changes
  const handleDateRangeChange = useCallback((newRange) => {
    if (loading) return; // Prevent change during loading
    setDateRange(newRange);
  }, [loading]);

  // Excel export function
  const exportToExcel = () => {
    if (submissions.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = submissions.map(submission => ({
      Date: dayjs(submission.createdAt).format('YYYY-MM-DD'),
      Department: submission.department.toUpperCase(),
      'Submitted By': submission.user.name,
      Email: submission.user.email,
      'Today Work': submission.todayWork,
      'Tomorrow Goal': submission.tomorrowGoal,
      'Efficiency Rating': submission.efficiencyRating,
      'Will Achieve Goal': submission.willAchieveGoal ? 'Yes' : 'No',
      'Reason Low Rating': submission.reasonLowRating || 'N/A',
      'Reason Not Achieving': submission.reasonNotAchieving || 'N/A',
      ...(submission.department === 'design' && {
        'Followed Creative Calendar': submission.followedCreativeCalendar ? 'Yes' : 'No',
        'Creative Calendar Deviation': submission.creativeCalendarDeviation || 'N/A'
      })
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productivity Data');
    
    const filename = `productivity_${dateRange.start.format('YYYY-MM-DD')}_to_${dateRange.end.format('YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Handle page change
  const handlePageChange = useCallback(async (event, value) => {
    if (loading) return; // Prevent page change during loading
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: value.toString(),
        limit: pagination.itemsPerPage.toString(),
        departments: selectedDepts.length > 0 ? selectedDeptsStr : allDepartmentsStr
      });

      const res = await fetch(`/api/productivity/range?${params}`, {
        method: "GET",
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setPagination(prev => ({
          ...prev,
          currentPage: value,
          totalItems: data.totalCount || 0,
          totalPages: Math.ceil((data.totalCount || 0) / prev.itemsPerPage)
        }));
      }
    } catch (err) {
      console.error('Error fetching page:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, startDate, endDate, selectedDeptsStr, allDepartmentsStr, selectedDepts.length, pagination.itemsPerPage]);

  // Calculate analytics data using useMemo to prevent re-renders
  const getAnalyticsData = useCallback(() => {
    if (submissions.length === 0) return null;

    // Efficiency trend over time by department
    const efficiencyByDepartment = submissions.reduce((acc, submission) => {
      const date = dayjs(submission.createdAt).format('MM/DD');
      const dept = submission.department;
      
      if (!acc[date]) {
        acc[date] = { date, departments: {} };
      }
      
      if (!acc[date].departments[dept]) {
        acc[date].departments[dept] = { total: 0, count: 0 };
      }
      
      acc[date].departments[dept].total += submission.efficiencyRating;
      acc[date].departments[dept].count += 1;
      
      return acc;
    }, {});

    // Convert to array and calculate averages
    const efficiencyTrendData = Object.values(efficiencyByDepartment).map(dateData => {
      const result = { date: dateData.date };
      let overallTotal = 0;
      let overallCount = 0;
      
      Object.entries(dateData.departments).forEach(([dept, data]) => {
        result[dept] = data.total / data.count;
        overallTotal += data.total;
        overallCount += data.count;
      });
      
      result.overall = overallTotal / overallCount;
      return result;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Daily submission frequency with department details
    const submissionFrequency = submissions.reduce((acc, submission) => {
      const date = dayjs(submission.createdAt).format('MM/DD');
      const dept = submission.department;
      
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.count += 1;
        if (!existing.departments[dept]) {
          existing.departments[dept] = 0;
        }
        existing.departments[dept] += 1;
      } else {
        acc.push({ 
          date, 
          count: 1, 
          departments: { [dept]: 1 } 
        });
      }
      
      return acc;
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      efficiencyTrendData,
      submissionFrequency,
    };
  }, [submissions]);

  const analytics = useMemo(() => getAnalyticsData(), [getAnalyticsData]);

  const getStatusColor = (submission) => {
    if (!submission) return '#ef4444'; // Red for not submitted
    if (submission.efficiencyRating >= 4) return '#22c55e'; // Green for high efficiency
    if (submission.efficiencyRating >= 3) return '#f59e0b'; // Yellow for medium efficiency
    return '#ef4444'; // Red for low efficiency
  };

  const getStatusIcon = (submission) => {
    if (!submission) return <WarningIcon sx={{ color: '#ef4444' }} />;
    if (submission.efficiencyRating >= 4) return <CheckCircleIcon sx={{ color: '#22c55e' }} />;
    if (submission.efficiencyRating >= 3) return <TimerIcon sx={{ color: '#f59e0b' }} />;
    return <WarningIcon sx={{ color: '#ef4444' }} />;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        py: { xs: 3, md: 4 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <AssessmentIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
              <Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  Productivity Dashboard
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 400,
                    mt: 0.5,
                  }}
                >
                  Team performance overview and insights
                </Typography>
              </Box>
            </Box>

            {/* Controls */}
            <Paper
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Grid container spacing={3} alignItems="center">
                {/* Date Range Chips */}
                <Grid item xs={12} md={8}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                      Select Date Range
                    </Typography>
                    <DateRangeChips
                      activeTag={activeTag}
                      setActiveTag={setActiveTag}
                      setDateRange={handleDateRangeChange}
                    />
                  </Box>
                </Grid>

                {/* Department Filter */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Filter Departments
                    </InputLabel>
                    <Select
                      multiple
                      value={selectedDepts}
                      onChange={e => setSelectedDepts(e.target.value)}
                      label="Filter Departments"
                      renderValue={selected => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map(value => (
                            <Chip 
                              key={value} 
                              label={value.toUpperCase()} 
                              size="small"
                              sx={{
                                bgcolor: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#3b82f6',
                          },
                        },
                        '& .MuiInputBase-input': {
                          color: '#ffffff',
                        },
                      }}
                    >
                      {departments.map(dept => (
                        <MenuItem key={dept} value={dept}>
                          {dept.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Stats and Actions */}
                <Grid item xs={12}>
                  <Stack 
                    direction={{ xs: "column", sm: "row" }} 
                    spacing={2} 
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      px: 3,
                      py: 1.5,
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      <TrendingUpIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {loading ? 'Loading...' : `${submissions.length} submissions in ${dayjs(dateRange.end).diff(dateRange.start, 'day') + 1} days`}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={exportToExcel}
                      disabled={loading || submissions.length === 0}
                      sx={{
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        color: '#3b82f6',
                        '&:hover': {
                          borderColor: '#3b82f6',
                          bgcolor: 'rgba(59, 130, 246, 0.1)',
                        },
                        '&:disabled': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }
                      }}
                    >
                      Export Excel
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Fade>

        {/* Table */}
        <Slide in direction="up" timeout={1000}>
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
              },
            }}
          >
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Date
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Department
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Submitted By
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Efficiency
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Goal Achievement
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Creative Calendar
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    if (loading) {
                      return Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {Array.from({ length: 7 }).map((_, cellIndex) => (
                            <TableCell key={`skeleton-cell-${index}-${cellIndex}`} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Skeleton 
                                variant="text" 
                                sx={{ 
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  height: 24,
                                }} 
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ));
                    } else if (error) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ 
                            textAlign: 'center', 
                            py: 4,
                            color: 'rgba(239, 68, 68, 0.8)'
                          }}>
                            <Typography variant="body1" sx={{ color: 'rgba(239, 68, 68, 0.8)', mb: 1 }}>
                              ⚠️ {error}
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={() => window.location.reload()}
                              sx={{ 
                                borderColor: 'rgba(239, 68, 68, 0.5)',
                                color: 'rgba(239, 68, 68, 0.8)',
                                '&:hover': {
                                  borderColor: '#ef4444',
                                  bgcolor: 'rgba(239, 68, 68, 0.1)'
                                }
                              }}
                            >
                              Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    } else if (submissions.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ 
                            textAlign: 'center', 
                            py: 4,
                            color: 'rgba(255, 255, 255, 0.6)'
                          }}>
                            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                              📋 No submissions found for the selected date range
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                              Try selecting a different date range or department
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      return submissions.map((submission) => {
                        const isExpanded = expandedRow === submission._id;
                        
                        return (
                          <React.Fragment key={submission._id}>
                            <TableRow
                              sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                                },
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              }}
                              onClick={() => setExpandedRow(isExpanded ? null : submission._id)}
                            >
                            {/* Date Column */}
                            <TableCell sx={{ py: 2.5 }}>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: '#ffffff',
                                    mb: 0.5,
                                  }}
                                >
                                  {dayjs(submission.createdAt).format('MMM DD, YYYY')}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {submission.dayOfWeek}
                                </Typography>
                              </Box>
                            </TableCell>

                            {/* Department Column */}
                            <TableCell sx={{ py: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Badge
                                  color="success"
                                  variant="dot"
                                  sx={{
                                    '& .MuiBadge-badge': {
                                      bgcolor: getStatusColor(submission),
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 2,
                                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle1"
                                      sx={{
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        fontSize: '0.9rem',
                                      }}
                                    >
                                      {submission.department.charAt(0).toUpperCase()}
                                    </Typography>
                                  </Box>
                                </Badge>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 600,
                                    color: '#ffffff',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  {submission.department.toUpperCase()}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            {/* Submitted By Column */}
                            <TableCell sx={{ py: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'rgba(59, 130, 246, 0.2)',
                                    border: '2px solid rgba(59, 130, 246, 0.3)',
                                  }}
                                >
                                  <PersonIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 500,
                                      color: '#ffffff',
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {submission.user.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {dayjs(submission.createdAt).format("HH:mm")}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            
                            {/* Efficiency Column */}
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                <Rating
                                  value={submission.efficiencyRating}
                                  precision={0.5}
                                  readOnly
                                  size="small"
                                  sx={{
                                    '& .MuiRating-iconFilled': { 
                                      color: '#fbbf24',
                                      fontSize: '1.2rem',
                                    },
                                    '& .MuiRating-iconEmpty': { 
                                      color: 'rgba(255, 255, 255, 0.2)',
                                      fontSize: '1.2rem',
                                    },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: getStatusColor(submission),
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {submission.efficiencyRating}/5
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            {/* Goal Achievement Column */}
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              <Chip
                                label={submission.willAchieveGoal ? 'On Track' : 'At Risk'}
                                size="small"
                                sx={{
                                  bgcolor: submission.willAchieveGoal 
                                    ? 'rgba(34, 197, 94, 0.2)' 
                                    : 'rgba(239, 68, 68, 0.2)',
                                  color: submission.willAchieveGoal ? '#22c55e' : '#ef4444',
                                  border: `1px solid ${submission.willAchieveGoal 
                                    ? 'rgba(34, 197, 94, 0.3)' 
                                    : 'rgba(239, 68, 68, 0.3)'}`,
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                }}
                              />
                            </TableCell>
                            
                            {/* Creative Calendar Column */}
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              {submission.department === 'design' ? (
                                <Chip
                                  label={submission.followedCreativeCalendar ? 'Followed' : 'Deviated'}
                                  size="small"
                                  sx={{
                                    bgcolor: submission.followedCreativeCalendar 
                                      ? 'rgba(34, 197, 94, 0.2)' 
                                      : 'rgba(251, 191, 36, 0.2)',
                                    color: submission.followedCreativeCalendar ? '#22c55e' : '#f59e0b',
                                    border: `1px solid ${submission.followedCreativeCalendar 
                                      ? 'rgba(34, 197, 94, 0.3)' 
                                      : 'rgba(251, 191, 36, 0.3)'}`,
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                  }}
                                />
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                >
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            
                            {/* Actions Column */}
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#3b82f6',
                                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    '&:hover': {
                                      bgcolor: 'rgba(59, 130, 246, 0.2)',
                                      transform: 'scale(1.05)',
                                    },
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row */}
                          {isExpanded && (
                            <TableRow key={`expanded-${submission._id}`}>
                              <TableCell 
                                colSpan={7} 
                                sx={{ 
                                  py: 0,
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                }}
                              >
                                <Fade in timeout={300}>
                                  <Box
                                    sx={{
                                      p: 3,
                                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                                      borderRadius: 2,
                                      m: 1,
                                      border: '1px solid rgba(255, 255, 255, 0.05)',
                                    }}
                                  >
                                    <Grid container spacing={3}>
                                      <Grid item xs={12} md={6}>
                                        <Typography
                                          variant="subtitle2"
                                          sx={{
                                            fontWeight: 600,
                                            color: '#3b82f6',
                                            mb: 1,
                                          }}
                                        >
                                          Today&apos;s Work
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            lineHeight: 1.6,
                                            mb: 2,
                                          }}
                                        >
                                          {submission.todayWork}
                                        </Typography>
                                      </Grid>

                                      <Grid item xs={12} md={6}>
                                        <Typography
                                          variant="subtitle2"
                                          sx={{
                                            fontWeight: 600,
                                            color: '#8b5cf6',
                                            mb: 1,
                                          }}
                                        >
                                          Tomorrow&apos;s Goal
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            lineHeight: 1.6,
                                            mb: 2,
                                          }}
                                        >
                                          {submission.tomorrowGoal}
                                        </Typography>
                                      </Grid>

                                      {submission.efficiencyRating <= 3 && submission.reasonLowRating && (
                                        <Grid item xs={12}>
                                          <Typography
                                            variant="subtitle2"
                                            sx={{
                                              fontWeight: 600,
                                              color: '#ef4444',
                                              mb: 1,
                                            }}
                                          >
                                            Efficiency Concerns
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              color: 'rgba(255, 255, 255, 0.8)',
                                              lineHeight: 1.6,
                                            }}
                                          >
                                            {submission.reasonLowRating}
                                          </Typography>
                                        </Grid>
                                      )}

                                      {!submission.willAchieveGoal && submission.reasonNotAchieving && (
                                        <Grid item xs={12}>
                                          <Typography
                                            variant="subtitle2"
                                            sx={{
                                              fontWeight: 600,
                                              color: '#f59e0b',
                                              mb: 1,
                                            }}
                                          >
                                            Goal Achievement Concerns
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              color: 'rgba(255, 255, 255, 0.8)',
                                              lineHeight: 1.6,
                                            }}
                                          >
                                            {submission.reasonNotAchieving}
                                          </Typography>
                                        </Grid>
                                      )}

                                      {/* Design Department Fields */}
                                      {submission.department === 'design' && (
                                        <>
                                          <Grid item xs={12} md={6}>
                                            <Typography
                                              variant="subtitle2"
                                              sx={{
                                                fontWeight: 600,
                                                color: '#06b6d4',
                                                mb: 1,
                                              }}
                                            >
                                              Creative Calendar Adherence
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <Chip
                                                label={submission.followedCreativeCalendar ? 'Followed' : 'Deviated'}
                                                size="small"
                                                sx={{
                                                  bgcolor: submission.followedCreativeCalendar 
                                                    ? 'rgba(34, 197, 94, 0.2)' 
                                                    : 'rgba(251, 191, 36, 0.2)',
                                                  color: submission.followedCreativeCalendar ? '#22c55e' : '#f59e0b',
                                                  border: `1px solid ${submission.followedCreativeCalendar 
                                                    ? 'rgba(34, 197, 94, 0.3)' 
                                                    : 'rgba(251, 191, 36, 0.3)'}`,
                                                  fontWeight: 500,
                                                }}
                                              />
                                            </Box>
                                          </Grid>

                                          {!submission.followedCreativeCalendar && submission.creativeCalendarDeviation && (
                                            <Grid item xs={12}>
                                              <Typography
                                                variant="subtitle2"
                                                sx={{
                                                  fontWeight: 600,
                                                  color: '#f59e0b',
                                                  mb: 1,
                                                }}
                                              >
                                                Creative Calendar Deviation Reason
                                              </Typography>
                                              <Typography
                                                variant="body2"
                                                sx={{
                                                  color: 'rgba(255, 255, 255, 0.8)',
                                                  lineHeight: 1.6,
                                                }}
                                              >
                                                {submission.creativeCalendarDeviation}
                                              </Typography>
                                            </Grid>
                                          )}
                                        </>
                                      )}
                                    </Grid>
                                  </Box>
                                </Fade>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    });
                  }
                })()}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {!loading && pagination.totalItems > 0 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mt: 3,
                gap: 2
              }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} submissions
                </Typography>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.currentPage}
                  onChange={handlePageChange}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                        borderColor: '#3b82f6',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: 'rgba(59, 130, 246, 0.4)',
                        },
                      },
                    },
                  }}
                />
              </Box>
            )}

            {/* Data Visualization - Only Two Graphs */}
            {!loading && submissions.length > 0 && analytics && (
              <Box sx={{ mt: 6 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 600,
                    mb: 3,
                    textAlign: 'center',
                  }}
                >
                  Productivity Analytics
                </Typography>
                
                <Grid container spacing={4}>
                  {/* Efficiency Trend Chart by Department */}
                  <Grid item xs={12} md={8}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 3,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          color: '#ffffff',
                          fontWeight: 600,
                          mb: 2,
                        }}
                      >
                        Efficiency Trend Over Time by Department
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={analytics.efficiencyTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255, 255, 255, 0.6)"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="rgba(255, 255, 255, 0.6)"
                            fontSize={12}
                            domain={[0, 5]}
                          />
                          <RechartsTooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: '#ffffff',
                            }}
                          />
                          
                          {/* Overall Average Line */}
                          <Line 
                            type="monotone" 
                            dataKey="overall" 
                            stroke="#ffffff" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ fill: '#ffffff', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, fill: '#ffffff' }}
                            name="Overall Average"
                          />
                          
                          {/* Department Lines */}
                          {departments.map((dept, index) => {
                            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
                            return (
                              <Line 
                                key={dept}
                                type="monotone" 
                                dataKey={dept} 
                                stroke={colors[index % colors.length]} 
                                strokeWidth={2}
                                dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, fill: colors[index % colors.length] }}
                                name={dept.toUpperCase()}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>

                  {/* Daily Submission Frequency */}
                  <Grid item xs={12} md={4}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 3,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          color: '#ffffff',
                          fontWeight: 600,
                          mb: 2,
                        }}
                      >
                        Daily Submission Frequency
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.submissionFrequency}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255, 255, 255, 0.6)"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="rgba(255, 255, 255, 0.6)"
                            fontSize={12}
                          />
                          <RechartsTooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: '#ffffff',
                            }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div style={{ 
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: '#ffffff'
                                  }}>
                                    <p style={{ margin: 0 }}>{`Date: ${label}`}</p>
                                    <p style={{ margin: 0 }}>{`Total Submissions: ${data.count}`}</p>
                                    <div style={{ marginTop: '8px' }}>
                                      <p style={{ margin: 0, fontWeight: 'bold' }}>Departments:</p>
                                      {Object.entries(data.departments).map(([dept, count]) => (
                                        <p key={dept} style={{ margin: 0, marginLeft: '8px' }}>
                                          {dept.toUpperCase()}: {count}
                                        </p>
                                      ))}
                                      {departments.filter(dept => !data.departments[dept]).length > 0 && (
                                        <div style={{ marginTop: '4px' }}>
                                          <p style={{ margin: 0, fontWeight: 'bold', color: '#ef4444' }}>
                                            No submissions:
                                          </p>
                                          {departments.filter(dept => !data.departments[dept]).map(dept => (
                                            <p key={dept} style={{ margin: 0, marginLeft: '8px', color: '#ef4444' }}>
                                              {dept.toUpperCase()}
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Slide>
      </Container>
    </Box>
  );
}
