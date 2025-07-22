"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CssBaseline,
  Container,
  Divider,
  Skeleton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Title as TitleIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import Goals from "@/components/goals/Goals";
import { useUser } from "@clerk/nextjs";

export default function AdminGoalsPage({ department }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sorting and filtering states
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showCompleted, setShowCompleted] = useState(true);

  const titleRef = useRef(null);
  const descRef = useRef(null);
  const deadlineRef = useRef(null);
  const priorityRef = useRef(null);

  const { user } = useUser();
  const isAllowed = user?.primaryEmailAddress?.emailAddress === "priyanshuyadav0404@gmail.com" || user?.primaryEmailAddress?.emailAddress === "luckysolanki902@gmail.com";

  useEffect(() => {
    async function fetchGoals() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          department: department,
          sortBy: sortBy,
          sortOrder: sortOrder,
          showCompleted: showCompleted.toString()
        });
        
        const res = await fetch(`/api/goals?${params}`);
        const data = await res.json();
        setGoals(data.goals || []);
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGoals();
  }, [department, sortBy, sortOrder, showCompleted]);

  const handleAddGoal = async () => {
    setIsSubmitting(true);
    
    // Create optimistic goal with temporary ID
    const tempId = `temp_${Date.now()}`;
    const optimisticGoal = {
      _id: tempId,
      title: newTitle,
      description: newDesc,
      department,
      deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      priority: newPriority,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      history: [{
        type: "created",
        modifiedAt: new Date().toISOString(),
        performedBy: {
          clerkUserId: user.id,
          name: user.fullName,
        },
      }],
    };

    // Optimistic update - immediately add to UI
    setGoals(prev => [optimisticGoal, ...prev]);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          department,
          deadline: newDeadline,
          priority: newPriority,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Replace optimistic goal with real server response
        setGoals(prev => prev.map(g => 
          g._id === tempId ? data.goal : g
        ));
        setNewTitle("");
        setNewDesc("");
        setNewDeadline("");
        setNewPriority("medium");
        setOpenDialog(false);
      } else {
        // Remove optimistic goal on error
        setGoals(prev => prev.filter(g => g._id !== tempId));
        console.error("Add goal failed:", data.message);
      }
    } catch (err) {
      // Remove optimistic goal on network error
      setGoals(prev => prev.filter(g => g._id !== tempId));
      console.error("Add goal failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (event, nextRef) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (nextRef) {
        nextRef.current?.focus();
      } else {
        handleAddGoal();
      }
    }
  };

  const handleDialogOpen = () => {
    setOpenDialog(true);
    // Focus on title field after dialog opens
    setTimeout(() => {
      titleRef.current?.focus();
    }, 100);
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8, pb: 4, px: { xs: 1, sm: 2 } }}>
        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              mb: { xs: 3, sm: 4 },
              gap: { xs: 2, sm: 2, md: 2 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: "bold",
                textTransform: "capitalize",
                fontFamily: "Jost, Arial, sans-serif",
                color: "text.primary",
                fontSize: { xs: "1.75rem", sm: "2.125rem", md: "3rem" },
                lineHeight: 1.2,
              }}
            >
              {department} Goals
            </Typography>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleDialogOpen}
              disabled={!isAllowed}
              sx={{
                ...(isAllowed ? {} : { display: "none" }),
                borderRadius: 2,
                fontWeight: 600,
                px: { xs: 2, sm: 3 },
                py: { xs: 1.5, sm: 2 },
                mt: { xs: 1, md: 0 },
                alignSelf: { xs: "stretch", sm: "flex-start", md: "unset" },
                bgcolor: "primary.main",
                fontSize: { xs: "0.875rem", sm: "1rem" },
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              }}
            >
              Add Goal
            </Button>
          </Box>

          {/* Sorting and Filtering Controls */}
          <Box
            sx={{
              mb: 3,
              p: 3,
              bgcolor: "background.paper",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <SortIcon fontSize="small" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="priority">Priority</MenuItem>
                    <MenuItem value="deadline">Deadline</MenuItem>
                    <MenuItem value="createdAt">Created Date</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={sortOrder}
                    label="Order"
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <MenuItem value="desc">Descending</MenuItem>
                    <MenuItem value="asc">Ascending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show Completed"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${goals.length} goals`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`${goals.filter(g => !g.isCompleted).length} pending`}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`${goals.filter(g => g.isCompleted).length} completed`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[1, 2, 3].map(i => (
                <Skeleton 
                  key={i} 
                  variant="rectangular" 
                  height={{ xs: 100, sm: 80 }} 
                  sx={{ 
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }} 
                />
              ))}
            </Box>
          ) : goals.length ? (
            <Goals isAllowed={isAllowed} goals={goals} setGoals={setGoals} />
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: { xs: 200, sm: 250 },
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 1,
                p: { xs: 3, sm: 4 },
                textAlign: "center",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: "text.secondary",
                  fontWeight: "medium",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  mb: 1,
                }}
              >
                No goals yet
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                Create your first goal to get started
              </Typography>
            </Box>
          )}
        </Container>

        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AddIcon color="primary" />
              <Typography variant="h6" component="span">
                Create New Goal
              </Typography>
            </Box>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                inputRef={titleRef}
                label="Goal Title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyPress={e => handleKeyPress(e, descRef)}
                fullWidth
                disabled={isSubmitting}
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TitleIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
              
              <TextField
                inputRef={descRef}
                label="Description"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                onKeyPress={e => handleKeyPress(e, deadlineRef)}
                fullWidth
                multiline
                minRows={3}
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                      <DescriptionIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
              
              <FormControl fullWidth disabled={isSubmitting}>
                <InputLabel>Priority</InputLabel>
                <Select
                  inputRef={priorityRef}
                  value={newPriority}
                  label="Priority"
                  onChange={(e) => setNewPriority(e.target.value)}
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="low">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="Low" size="small" color="success" variant="outlined" />
                      <Typography>Low Priority</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="Medium" size="small" color="info" variant="outlined" />
                      <Typography>Medium Priority</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="high">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="High" size="small" color="warning" variant="outlined" />
                      <Typography>High Priority</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="urgent">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="Urgent" size="small" color="error" variant="outlined" />
                      <Typography>Urgent Priority</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                inputRef={deadlineRef}
                label="Deadline"
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                onKeyPress={e => handleKeyPress(e, null)}
                fullWidth
                disabled={isSubmitting}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={() => setOpenDialog(false)} 
              disabled={isSubmitting}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddGoal} 
              variant="contained" 
              disabled={!newTitle.trim() || isSubmitting}
              sx={{ 
                borderRadius: 2,
                minWidth: 80,
              }}
            >
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
