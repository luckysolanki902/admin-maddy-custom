'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  ListSubheader
} from '@mui/material';
import { styled } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import CommentIcon from '@mui/icons-material/Comment';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Styled components
const DashboardHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4, 3),
  backgroundImage: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
  color: 'white',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: 'url("/feature-bg.svg")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right center',
    backgroundSize: 'contain',
    opacity: 0.1,
    zIndex: 0,
  }
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
  overflow: 'hidden',
  height: '100%',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 25px 0 rgba(0,0,0,0.15)',
  }
}));

const StatusBadge = styled(Chip)(({ theme, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return { background: theme.palette.info.main, color: theme.palette.info.contrastText };
      case 'In Review': return { background: theme.palette.warning.main, color: theme.palette.warning.contrastText };
      case 'Approved': return { background: theme.palette.success.main, color: theme.palette.success.contrastText };
      case 'In Progress': return { background: '#FF9800', color: '#fff' };
      case 'Completed': return { background: '#4CAF50', color: '#fff' };
      case 'Rejected': return { background: theme.palette.error.main, color: theme.palette.error.contrastText };
      default: return { background: theme.palette.grey[500], color: '#fff' };
    }
  };

  return {
    backgroundColor: getStatusColor(status).background,
    color: getStatusColor(status).color,
    fontWeight: 600,
    fontSize: '0.75rem',
    borderRadius: '16px',
  };
});

const PriorityIndicator = styled('div')(({ theme, priority }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return theme.palette.info.main;
      case 'Medium': return theme.palette.warning.main;
      case 'High': return theme.palette.error.light;
      case 'Critical': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: getPriorityColor(priority),
    display: 'inline-block',
    marginRight: theme.spacing(1),
  };
});

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
  background: theme.palette.background.paper,
  transition: 'all 0.3s ease'
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  '& .MuiTableCell-root': {
    backgroundColor: theme.palette.mode === 'dark' ? '#2D2D2D' : theme.palette.grey[100],
    fontWeight: 600,
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
    padding: theme.spacing(1.5, 2),
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '& .MuiTableCell-root': {
    padding: theme.spacing(1.5, 2),
    fontSize: '0.875rem',
  }
}));

// Card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: delay * 0.1,
    }
  }),
};

// Dashboard stats cards component
const StatCard = ({ icon, title, value, color, index }) => {
  const theme = useTheme();
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{ scale: 1.03 }}
    >
      <StyledCard>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="overline" color="textSecondary" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" component="div" fontWeight="600">
                {value}
              </Typography>
            </Box>
            <Avatar
              sx={{
                bgcolor: color,
                color: '#fff',
                width: 50,
                height: 50,
                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
              }}
            >
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </StyledCard>
    </motion.div>
  );
};

// Feature request item for mobile view
const MobileFeatureRequestCard = ({ request, handleViewDetails }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: theme.shadows[1] }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="600" noWrap sx={{ maxWidth: '70%' }} title={request.title}>
            {request.title}
          </Typography>
          <StatusBadge label={request.status} status={request.status} size="small" />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Avatar 
            sx={{ 
              width: 24, 
              height: 24, 
              fontSize: '0.75rem',
              bgcolor: theme.palette.grey[300],
              color: theme.palette.text.secondary,
              mr: 1 
            }}
          >
            {request.requestedBy.name.charAt(0)}
          </Avatar>
          <Typography variant="caption" color="textSecondary">
            {request.requestedBy.name} ({request.requestedBy.department})
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1.5 }} />
        
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PriorityIndicator priority={request.priority} />
              <Typography variant="caption" fontWeight="500">{request.priority} Priority</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary" align="right" display="block">
              {new Date(request.createdAt).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
        
        {request.tags && request.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1.5 }}>
            {request.tags.slice(0, 3).map((tag) => (
              <Chip 
                key={tag} 
                label={tag} 
                size="small" 
                sx={{ height: 20, fontSize: '0.6875rem', borderRadius: '4px' }}
              />
            ))}
            {request.tags.length > 3 && (
              <Chip 
                label={`+${request.tags.length - 3}`} 
                size="small" 
                variant="outlined"
                sx={{ height: 20, fontSize: '0.6875rem', borderRadius: '4px' }}
              />
            )}
          </Box>
        )}
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderTop: '1px solid',
        borderColor: theme.palette.divider
      }}>
        <Button 
          fullWidth
          startIcon={<VisibilityIcon />}
          onClick={() => handleViewDetails(request._id)}
          sx={{ borderRadius: 0, py: 1.25, textTransform: 'none', fontWeight: 500 }}
        >
          View Details
        </Button>
      </Box>
    </Card>
  );
};

const FeatureRequestDashboard = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Check if user is admin/developer with edit privileges
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    completed: 0,
    byDepartment: {},
  });
  
  // Filter options
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  // Check user role when loaded
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const department = user.publicMetadata?.department;
      const role = user.publicMetadata?.role;
      
      if (department === 'Admin' || department === 'Developer' || 
          role === 'admin' || role === 'webD') {
        setIsAdmin(true);
      }
    }
  }, [isLoaded, isSignedIn, user]);
  
  // Fetch data
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedTab !== 'all') queryParams.append('status', selectedTab);
      if (filterDepartment !== 'all') queryParams.append('department', filterDepartment);
      if (filterPriority !== 'all') queryParams.append('priority', filterPriority);
      queryParams.append('page', page + 1); // Backend uses 1-based pagination
      queryParams.append('limit', rowsPerPage);
      
      const response = await fetch(`/api/admin/feature-requests?${queryParams.toString()}`);
      
      if (!response.ok) throw new Error('Failed to fetch feature requests');
      
      const data = await response.json();
      
      setRequests(data.featureRequests || []);
      setTotalCount(data.pagination.total);
      
      // Calculate stats
      calculateStats(data.featureRequests);
    } catch (error) {
      console.error('Error fetching feature requests:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate statistics from fetched data
  const calculateStats = (requests) => {
    const newStats = {
      total: requests.length,
      new: requests.filter(r => r.status === 'New').length,
      inProgress: requests.filter(r => r.status === 'In Progress').length,
      completed: requests.filter(r => r.status === 'Completed').length,
      byDepartment: {},
    };
    
    // Count requests by department
    requests.forEach(request => {
      if (!newStats.byDepartment[request.targetDepartment]) {
        newStats.byDepartment[request.targetDepartment] = 0;
      }
      newStats.byDepartment[request.targetDepartment]++;
    });
    
    setStats(newStats);
  };
  
  // Filter requests based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRequests(requests);
      return;
    }
    
    const normalizedQuery = searchQuery.toLowerCase();
    
    const filtered = requests.filter(request => 
      request.title.toLowerCase().includes(normalizedQuery) || 
      request.description.toLowerCase().includes(normalizedQuery) ||
      request.requestedBy.name.toLowerCase().includes(normalizedQuery) ||
      (request.tags && request.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)))
    );
    
    setFilteredRequests(filtered);
  }, [searchQuery, requests]);
  
  // Initial data fetch and when filters change
  useEffect(() => {
    fetchRequests();
  }, [selectedTab, filterDepartment, filterPriority, page, rowsPerPage]);
  
  // Handle tab changes for status filter
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setPage(0);
  };

  // Handle pagination changes
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Context menu handlers
  const handleMenuOpen = (event, requestId) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedRequestId(requestId);
  };
  
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedRequestId(null);
  };
  
  // Handle viewing details
  const handleViewDetails = (requestId) => {
    router.push(`/admin/feature-requests/${requestId}`);
    handleMenuClose();
  };
  
  // Handle voting
  const handleVote = async (requestId, voteType) => {
    if (!isSignedIn) {
      alert('Please sign in to vote on feature requests');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/feature-requests/${requestId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType }),
      });
      
      if (!response.ok) throw new Error('Failed to vote');
      
      // Refresh requests after voting
      fetchRequests();
    } catch (error) {
      console.error('Error voting on feature request:', error);
      alert('Failed to vote. Please try again later.');
    }
  };
  
  // Handle status update (admin only)
  const handleUpdateStatus = async (newStatus) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`/api/admin/feature-requests/${selectedRequestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      // Refresh requests after update
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      handleMenuClose();
    }
  };

  // Return loading state
  if (loading && requests.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Dashboard Header */}
      <DashboardHeader>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" component="h1" fontWeight="700" gutterBottom>
            Feature Requests Dashboard
          </Typography>
          
          <Typography variant="body1" color="rgba(255, 255, 255, 0.7)" paragraph sx={{ maxWidth: '600px' }}>
            Browse, vote, and comment on feature requests from across departments. Help us prioritize new features and improvements.
          </Typography>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={Link}
              href="/admin/feature-requests/create"
              sx={{ 
                borderRadius: '8px',
                background: 'white',
                color: '#2d2d2d',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)'
                }
              }}
            >
              Submit New Request
            </Button>
            

          </Box>
        </Box>
      </DashboardHeader>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} lg={3}>
          <StatCard
            icon={<AssignmentIcon fontSize="large" color="blue" />}
            title="Total Requests"
            value={stats.total}
            color={theme.palette.primary.main}
            index={0}
          />
        </Grid>
        <Grid item xs={6} sm={6} lg={3}>
          <StatCard
            icon={<HelpOutlineIcon fontSize="large" />}
            title="New Requests"
            value={stats.new}
            color="#2196F3" // Blue
            index={1}
          />
        </Grid>
        <Grid item xs={6} sm={6} lg={3}>
          <StatCard
            icon={<CheckCircleIcon fontSize="large" />}
            title="Completed"
            value={stats.completed}
            color="#4CAF50" // Green
            index={3}
          />
        </Grid>
      </Grid>
      
      {/* Filters and Search */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, md: 3 },
          mb: 3, 
          borderRadius: 2,
          border: '1px solid',
          borderColor: theme.palette.divider,
          bgcolor: theme.palette.background.default
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search requests by title, description, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 1.5 }
              }}
              size="medium"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            {/* Department Filter */}
            <TextField
              select
              fullWidth
              label="Department"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              size="medium"
            >
              <MenuItem value="all">All Departments</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
              <MenuItem value="Design">Designer</MenuItem>
              <MenuItem value="Web">Developer</MenuItem>
              <MenuItem value="Production">Production</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            {/* Priority Filter */}
            <TextField
              select
              fullWidth
              label="Priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              size="medium"
            >
              <MenuItem value="all">All Priorities</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Status Tabs */}
      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minWidth: { xs: 'auto', md: 120 },
            fontWeight: 500,
            borderRadius: '4px 4px 0 0',
            py: 1,
            px: 2,
          },
          '& .Mui-selected': {
            fontWeight: 600,
          }
        }}
      >
        <Tab label="All Requests" value="all" />
        <Tab 
          label={
            <Badge badgeContent={stats.new} color="error" sx={{ '& .MuiBadge-badge': { top: -5, right: -12 } }}>
              New
            </Badge>
          } 
          value="New" 
        />
        <Tab label="Approved" value="Approved" />
        <Tab label="Completed" value="Completed" />
      </Tabs>
      
      {/* Mobile View: Card List */}
      {isMobile && filteredRequests.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <AnimatePresence>
            {filteredRequests.map((request, index) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <MobileFeatureRequestCard 
                  request={request}
                  handleViewDetails={() => handleViewDetails(request._id)}
                  isAdmin={isAdmin}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Mobile Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      )}
      
      {/* Desktop View: Requests Table */}
      {!isMobile && (
        <StyledTableContainer component={Paper}>
          <Table>
            <StyledTableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Requested By</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Votes</TableCell>
                <TableCell>Created</TableCell>

              </TableRow>
            </StyledTableHead>
            
            <TableBody>
              {loading && requests.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" color="textSecondary">
                      No feature requests found
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {searchQuery ? 'Try adjusting your search criteria' : 'Create your first feature request'}
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      component={Link}
                      href="/admin/feature-requests/create"
                      sx={{ mt: 2 }}
                    >
                      New Request
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <StyledTableRow 
                    key={request._id} 
                    hover 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => router.push(`/admin/feature-requests/${request._id}`)}
                  >
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography fontWeight="500" noWrap title={request.title}>
                        {request.title}
                      </Typography>
                      {request.tags && request.tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {request.tags.slice(0, 2).map((tag) => (
                            <Chip 
                              key={tag} 
                              label={tag} 
                              size="small" 
                              sx={{ height: 20, fontSize: '0.6875rem', borderRadius: '4px' }}
                            />
                          ))}
                          {request.tags.length > 2 && (
                            <Chip 
                              label={`+${request.tags.length - 2}`} 
                              size="small" 
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.6875rem', borderRadius: '4px' }}
                            />
                          )}
                        </Box>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24, 
                            fontSize: '0.75rem',
                            bgcolor: theme.palette.primary.main,
                            mr: 1 
                          }}
                        >
                          {request.requestedBy.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" noWrap>
                            {request.requestedBy.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            {request.requestedBy.department}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={request.targetDepartment}
                        size="small"
                        sx={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 500,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                        }}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PriorityIndicator priority={request.priority} />
                        {request.priority}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <StatusBadge 
                        label={request.status} 
                        status={request.status}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <Tooltip title="Upvotes">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ThumbUpIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">{request.upvotes?.length || 0}</Typography>
                          </Box>
                        </Tooltip>
                        
                        <Tooltip title="Downvotes">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ThumbDownIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">{request.downvotes?.length || 0}</Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Tooltip title={new Date(request.createdAt).toLocaleString()}>
                        <Typography variant="body2">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    
                  </StyledTableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Table Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </StyledTableContainer>
      )}
      
    </Container>
  );
};

export default FeatureRequestDashboard;
