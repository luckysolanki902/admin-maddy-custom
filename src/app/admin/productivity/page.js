"use client";

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
} from "@mui/material";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { departmentAdmins } from "@/lib/constants/user";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import TimerIcon from "@mui/icons-material/Timer";
import PersonIcon from "@mui/icons-material/Person";

export default function ProductivityOverview() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  const departments = Object.keys(departmentAdmins);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/productivity?date=${selectedDate.format("YYYY-MM-DD")}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        setSubmissions(data.submissions || {});
      } catch (err) {
        console.error(err);
        alert("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  const displayedDepartments = selectedDepts.length > 0 ? selectedDepts : departments;

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
              <Stack 
                direction={{ xs: "column", sm: "row" }} 
                spacing={3} 
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={newValue => setSelectedDate(newValue)}
                  maxDate={dayjs()}
                  format="YYYY-MM-DD"
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
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#3b82f6',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#ffffff',
                    },
                  }}
                />

                <FormControl sx={{ minWidth: { xs: '100%', sm: 300 } }}>
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
                    {displayedDepartments.filter(dept => submissions[dept]).length} of {displayedDepartments.length} submitted
                  </Typography>
                </Box>
              </Stack>
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
                      Status
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
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 6 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
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
                    ))
                  ) : (
                    displayedDepartments.map((dept, index) => {
                      const submission = submissions[dept];
                      const isExpanded = expandedRow === dept;
                      
                      return (
                        <>
                          <TableRow
                            key={dept}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                              },
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                            onClick={() => setExpandedRow(isExpanded ? null : dept)}
                          >
                            <TableCell sx={{ py: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Badge
                                  color={submission ? 'success' : 'error'}
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
                                      {dept.charAt(0).toUpperCase()}
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
                                  {dept.toUpperCase()}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell sx={{ py: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {getStatusIcon(submission)}
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: getStatusColor(submission),
                                  }}
                                >
                                  {submission ? 'Submitted' : 'Pending'}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell sx={{ py: 2.5 }}>
                              {submission ? (
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
                                      {dayjs(submission.createdAt).format("MMM DD, HH:mm")}
                                    </Typography>
                                  </Box>
                                </Box>
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              {submission ? (
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
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              {submission ? (
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
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            
                            <TableCell align="center" sx={{ py: 2.5 }}>
                              {submission && (
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
                              )}
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row */}
                          {isExpanded && submission && (
                            <TableRow>
                              <TableCell 
                                colSpan={6} 
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
                                    <Stack spacing={3}>
                                      <Box>
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
                                          }}
                                        >
                                          {submission.todayWork}
                                        </Typography>
                                      </Box>

                                      <Box>
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
                                          }}
                                        >
                                          {submission.tomorrowGoal}
                                        </Typography>
                                      </Box>

                                      {submission.efficiencyRating <= 3 && submission.reasonLowRating && (
                                        <Box>
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
                                        </Box>
                                      )}

                                      {!submission.willAchieveGoal && submission.reasonNotAchieving && (
                                        <Box>
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
                                        </Box>
                                      )}
                                    </Stack>
                                  </Box>
                                </Fade>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Slide>
      </Container>
    </Box>
  );
}
