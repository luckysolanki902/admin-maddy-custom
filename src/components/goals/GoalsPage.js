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
  const [newPriorityPosition, setNewPriorityPosition] = useState(0); // 0 = top, 1+ = position
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useUser();
  // Sorting and filtering states
  const [sortBy, setSortBy] = useState("priorityOrder");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showCompleted, setShowCompleted] = useState(user?.primaryEmailAddress?.emailAddress === "priyanshuyadav0404@gmail.com"); // only true for priyanshu
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const deadlineRef = useRef(null);
  const priorityRef = useRef(null);

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
      const goalData = {
        title: newTitle,
        description: newDesc,
        department,
        deadline: newDeadline,
        priority: newPriority,
      };

      // Add priority position if user has permission and position is selected
      if (isAllowed && newPriorityPosition !== null) {
        goalData.priorityPosition = newPriorityPosition;
      }

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalData),
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
        setNewPriorityPosition(null);
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
            <Goals isAllowed={isAllowed} goals={goals} setGoals={setGoals} department={department} />
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
              
              {/* Priority Section */}
              <Box>

                       <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Priority & Position
                </Typography>
                {/* Priority Position Selector */}
                {isAllowed && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      Choose position in priority list:
                    </Typography>
                    
                    {(() => {
                      const incompleteGoals = goals.filter(g => !g.isCompleted);
                      const totalPositions = incompleteGoals.length + 1;
                      
                      return (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 0.5,
                          maxHeight: 180,
                          overflowY: 'auto',
                          bgcolor: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 1.5,
                          p: 1.5,
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {/* Quick options */}
                          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <Button
                              size="small"
                              variant={newPriorityPosition === 0 ? 'contained' : 'outlined'}
                              onClick={() => setNewPriorityPosition(0)}
                              sx={{
                                flex: 1,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                py: 0.5,
                                bgcolor: newPriorityPosition === 0 ? 'primary.main' : 'transparent',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                color: newPriorityPosition === 0 ? 'black' : 'white',
                                '&:hover': {
                                  bgcolor: newPriorityPosition === 0 ? 'primary.dark' : 'rgba(255, 255, 255, 0.05)',
                                  borderColor: 'rgba(255, 255, 255, 0.3)',
                                }
                              }}
                            >
                              Top Priority
                            </Button>
                            <Button
                              size="small"
                              variant={newPriorityPosition === totalPositions - 1 ? 'contained' : 'outlined'}
                              onClick={() => setNewPriorityPosition(totalPositions - 1)}
                              sx={{
                                flex: 1,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                py: 0.5,
                                bgcolor: newPriorityPosition === totalPositions - 1 ? 'primary.main' : 'transparent',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                color: newPriorityPosition === totalPositions - 1 ? 'black' : 'white',
                                '&:hover': {
                                  bgcolor: newPriorityPosition === totalPositions - 1 ? 'primary.dark' : 'rgba(255, 255, 255, 0.05)',
                                  borderColor: 'rgba(255, 255, 255, 0.3)',
                                }
                              }}
                            >
                              Bottom
                            </Button>
                          </Box>

                          {/* Specific positions if there are existing goals */}
                          {incompleteGoals.length > 0 && (
                            <>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, fontSize: '0.7rem', fontWeight: 500 }}>
                                Or place between existing goals:
                              </Typography>
                              
                              {incompleteGoals.map((goal, index) => (
                                <Box
                                  key={goal._id}
                                  onClick={() => setNewPriorityPosition(index + 1)}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: newPriorityPosition === index + 1 ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                                    border: '1px solid',
                                    borderColor: newPriorityPosition === index + 1 ? 'rgba(25, 118, 210, 0.6)' : 'rgba(255, 255, 255, 0.12)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      bgcolor: newPriorityPosition === index + 1 ? 'rgba(25, 118, 210, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                      borderColor: newPriorityPosition === index + 1 ? 'rgba(25, 118, 210, 0.7)' : 'rgba(255, 255, 255, 0.2)',
                                    }
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                                      <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        minWidth: 'fit-content'
                                      }}>
                                        <Typography variant="caption" sx={{ 
                                          color: 'rgba(255, 255, 255, 0.5)', 
                                          fontSize: '0.7rem',
                                          fontWeight: 500
                                        }}>
                                          After
                                        </Typography>
                                        <Box sx={{
                                          width: 18,
                                          height: 18,
                                          borderRadius: '50%',
                                          bgcolor: 'rgba(255, 255, 255, 0.15)',
                                          border: '1px solid rgba(255, 255, 255, 0.2)',
                                          color: 'rgba(255, 255, 255, 0.8)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.65rem',
                                          fontWeight: 600,
                                        }}>
                                          {index + 1}
                                        </Box>
                                      </Box>
                                      <Typography variant="body2" sx={{ 
                                        color: 'rgba(255, 255, 255, 0.85)',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {goal.title}
                                      </Typography>
                                    </Box>
                                    {/* <Chip 
                                      label={goal.priority || 'medium'} 
                                      size="small" 
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        bgcolor: goal.priority === 'urgent' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                                        color: goal.priority === 'urgent' ? 'rgba(255, 183, 177, 1)' : 'rgba(144, 202, 249, 1)',
                                        border: '1px solid',
                                        borderColor: goal.priority === 'urgent' ? 'rgba(244, 67, 54, 0.4)' : 'rgba(33, 150, 243, 0.4)',
                                      }}
                                    /> */}
                                  </Box>
                                </Box>
                              ))}
                            </>
                          )}
                        </Box>
                      );
                    })()}
                  </Box>
                )}

         
                
                {/* Priority Level */}
                <FormControl fullWidth disabled={isSubmitting} sx={{ mb: 3, mt: 3 }}>
                  <InputLabel>Priority Level</InputLabel>
                  <Select
                    inputRef={priorityRef}
                    value={newPriority}
                    label="Priority Level"
                    onChange={(e) => setNewPriority(e.target.value)}
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    <MenuItem value="medium">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Medium" size="small" color="info" variant="outlined" />
                        <Typography>Medium Priority</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="urgent">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Urgent" size="small" color="error" variant="filled" />
                        <Typography>Urgent Priority</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
      
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
