"use client";

import {
  Box,
  Typography,
  Paper,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useState, useRef } from "react";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Title as TitleIcon,
} from "@mui/icons-material";

export default function Goals({ goals, setGoals, isAllowed }) {
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDesc, setEditedDesc] = useState("");
  const [editedDeadline, setEditedDeadline] = useState("");
  const [editedPriority, setEditedPriority] = useState("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const titleRef = useRef(null);
  const descRef = useRef(null);
  const deadlineRef = useRef(null);
  const priorityRef = useRef(null);

  const openEditDialog = goal => {
    setCurrentGoal(goal);
    setEditedTitle(goal.title ?? "");
    setEditedDesc(goal.description ?? "");
    setEditedDeadline(goal?.deadline?.slice(0, 10) ?? "");
    setEditedPriority(goal.priority ?? "medium");
    setEditDialogOpen(true);
    setTimeout(() => {
      titleRef.current?.focus();
    }, 100);
  };

  const handleEditSave = async () => {
    if (!currentGoal) return;
    setIsSaving(true);

    // Store original values for potential rollback
    const originalGoal = { ...currentGoal };
    
    // Optimistic update - immediately update UI
    const optimisticUpdate = {
      ...currentGoal,
      title: editedTitle,
      description: editedDesc,
      deadline: editedDeadline ? new Date(editedDeadline).toISOString() : null,
      priority: editedPriority,
    };
    
    setGoals(prev => prev.map(g => 
      g._id === currentGoal._id ? optimisticUpdate : g
    ));

    try {
      const res = await fetch(`/api/goals/${currentGoal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          description: editedDesc,
          deadline: editedDeadline,
          priority: editedPriority,
        }),
      });
      
      const data = await res.json();

      if (res.ok) {
        // Update with server response (includes history and other server data)
        setGoals(prev => prev.map(g => (g._id === data.goal._id ? data.goal : g)));
      } else {
        // Revert optimistic update on error
        setGoals(prev => prev.map(g => 
          g._id === currentGoal._id ? originalGoal : g
        ));
        console.error("Edit failed:", data.message);
      }
    } catch (err) {
      // Revert optimistic update on network error
      setGoals(prev => prev.map(g => 
        g._id === currentGoal._id ? originalGoal : g
      ));
      console.error("Failed to edit goal", err);
    } finally {
      setIsSaving(false);
      setEditDialogOpen(false);
      setCurrentGoal(null);
    }
  };

  const handleDeleteGoal = async goalId => {
    const confirmDelete = window.confirm("Are you sure you want to delete this goal?");
    if (!confirmDelete) return;

    // Store original goals for potential rollback
    const originalGoals = [...goals];
    setDeletingId(goalId);
    
    // Optimistic update - immediately remove from UI
    setGoals(prev => prev.filter(goal => goal._id !== goalId));

    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        // Revert optimistic update on error
        setGoals(originalGoals);
        alert(data.error || "Failed to delete goal");
      }
      // If successful, the optimistic update stands
    } catch (err) {
      // Revert optimistic update on network error
      setGoals(originalGoals);
      console.error("Error deleting goal:", err);
      alert("Failed to delete goal. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (goalId, newStatus) => {
    // Optimistic update - immediately update UI
    setGoals(prev => prev.map(g => 
      g._id === goalId 
        ? { ...g, isCompleted: newStatus }
        : g
    ));

    setTogglingId(goalId);
    
    try {
      const res = await fetch(`/api/goals/${goalId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newStatus }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Update with server response (includes any additional data like history)
        setGoals(prev => prev.map(g => (g._id === data.goal._id ? data.goal : g)));
      } else {
        // Revert optimistic update on error
        setGoals(prev => prev.map(g => 
          g._id === goalId 
            ? { ...g, isCompleted: !newStatus }
            : g
        ));
        console.error("Toggle failed:", data.error);
      }
    } catch (err) {
      // Revert optimistic update on network error
      setGoals(prev => prev.map(g => 
        g._id === goalId 
          ? { ...g, isCompleted: !newStatus }
          : g
      ));
      console.error("Toggle error", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleKeyPress = (event, nextRef) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (nextRef) {
        nextRef.current?.focus();
      } else {
        handleEditSave();
      }
    }
  };

  const getDeadlineStatus = (deadline, isCompleted) => {
    if (isCompleted) return "completed";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    if (deadlineDate < today) return "overdue";
    if (deadlineDate.getTime() === today.getTime()) return "today";
    return "upcoming";
  };

  const getDeadlineChip = (deadline, isCompleted) => {
    const status = getDeadlineStatus(deadline, isCompleted);
    const colors = {
      completed: { color: "success", label: "Completed" },
      overdue: { color: "error", label: "Overdue" },
      today: { color: "warning", label: "Due Today" },
      upcoming: { color: "info", label: "Upcoming" },
    };
    
    return (
      <Chip
        size="small"
        label={colors[status].label}
        color={colors[status].color}
        variant={status === "completed" ? "filled" : "outlined"}
      />
    );
  };

  const getPriorityChip = (priority) => {
    const priorityConfig = {
      low: { color: "success", label: "Low", variant: "outlined" },
      medium: { color: "info", label: "Medium", variant: "outlined" },
      high: { color: "warning", label: "High", variant: "filled" },
      urgent: { color: "error", label: "Urgent", variant: "filled" },
    };
    
    const config = priorityConfig[priority] || priorityConfig.medium;
    
    return (
      <Chip
        size="small"
        label={config.label}
        color={config.color}
        variant={config.variant}
        sx={{
          fontWeight: priority === 'urgent' || priority === 'high' ? 600 : 400,
        }}
      />
    );
  };

  return (
    <Paper elevation={2} sx={{ borderRadius: 3, bgcolor: "background.paper", overflow: "hidden" }}>
      <List sx={{ p: 0 }}>
        {goals.map((goal, index) => {
          const isExpanded = expandedGoalId === goal._id;
          const isToggling = togglingId === goal._id;
          const isDeleting = deletingId === goal._id;
          const isOptimistic = goal._id?.startsWith?.('temp_');

          return (
            <Box key={goal._id}>
              <ListItem
                sx={{
                  py: 2,
                  px: 3,
                  bgcolor: goal.isCompleted ? "action.hover" : "transparent",
                  opacity: isDeleting ? 0.5 : isOptimistic ? 0.8 : 1,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: goal.isCompleted ? "action.selected" : "action.hover",
                  },
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                {/* Checkbox Section - Fixed Width */}
                <Box sx={{ 
                  flexShrink: 0,
                  pt: 0.5,
                }}>
                  <IconButton
                    size="small"
                    disabled={ isToggling || isOptimistic}
                    onClick={() => handleToggle(goal._id, !goal.isCompleted)}
                    sx={{ 
                      transition: "all 0.2s ease-in-out",
                      p: 0.5,
                    }}
                  >
                    {goal.isCompleted ? (
                      <CheckCircleIcon 
                        color="success" 
                        sx={{ 
                          opacity: isToggling ? 0.5 : 1,
                          transform: isToggling ? "scale(0.9)" : "scale(1)",
                          transition: "all 0.2s ease-in-out",
                        }} 
                      />
                    ) : (
                      <UncheckedIcon 
                        color="action" 
                        sx={{ 
                          opacity: isToggling ? 0.5 : 1,
                          transform: isToggling ? "scale(0.9)" : "scale(1)",
                          transition: "all 0.2s ease-in-out",
                        }} 
                      />
                    )}
                  </IconButton>
                </Box>

                {/* Content Section - Flexible Width */}
                <Box sx={{ 
                  flex: 1, 
                  minWidth: 0, // Allows text to truncate properly
                  pr: { xs: 1, sm: 2 },
                }}>
                  {/* Title and Chip Row */}
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: { xs: "flex-start", sm: "center" }, 
                    gap: 1, 
                    mb: 1,
                    flexDirection: { xs: "column", sm: "row" },
                  }}>
                    <Typography
                      variant="h6"
                      sx={{
                        textDecoration: goal.isCompleted ? "line-through" : "none",
                        opacity: goal.isCompleted ? 0.7 : 1,
                        fontWeight: 500,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                        flex: { sm: 1 },
                      }}
                    >
                      {goal.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
                      {getPriorityChip(goal.priority)}
                      {goal.deadline && getDeadlineChip(goal.deadline, goal.isCompleted)}
                    </Box>
                  </Box>

                  {/* Description and Deadline Info */}
                  <Box>
                    {goal.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          opacity: goal.isCompleted ? 0.7 : 1,
                          wordBreak: "break-word",
                          lineHeight: 1.4,
                        }}
                      >
                        {goal.description}
                      </Typography>
                    )}
                    {goal.deadline && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: "block",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        }}
                      >
                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Actions Section - Fixed Width */}
                {isAllowed && (
                  <Box sx={{ 
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 0.5, sm: 0.5 },
                    alignItems: "center",
                  }}>
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(goal)}
                      disabled={!isAllowed || isToggling || isOptimistic}
                      sx={{ 
                        p: { xs: 0.75, sm: 0.5 },
                        minWidth: "auto",
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteGoal(goal._id)}
                      disabled={!isAllowed || isToggling || isOptimistic}
                      sx={{ 
                        p: { xs: 0.75, sm: 0.5 },
                        minWidth: "auto",
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setExpandedGoalId(isExpanded ? null : goal._id)}
                      disabled={!isAllowed || isToggling || isOptimistic}
                      sx={{ 
                        p: { xs: 0.75, sm: 0.5 },
                        minWidth: "auto",
                      }}
                    >
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <HistoryIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                )}
              </ListItem>

              <Collapse in={isExpanded}>
                <Box sx={{ 
                  px: { xs: 2, sm: 3 }, 
                  py: 2, 
                  bgcolor: "action.hover" 
                }}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 600,
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    }}
                  >
                    Activity History
                  </Typography>
                  {goal.history.length === 0 ? (
                    <Typography 
                      variant="body2" 
                      color="text.disabled"
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      No activity yet
                    </Typography>
                  ) : (
                    <Box sx={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: { xs: 1, sm: 1.5 },
                    }}>
                      {goal.history.map((h, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "stretch", sm: "center" },
                            gap: { xs: 1, sm: 2 },
                            p: { xs: 1, sm: 1.5 },
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box sx={{ 
                            minWidth: 0, 
                            flex: 1,
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "flex-start", sm: "center" },
                            gap: { xs: 0.5, sm: 2 },
                          }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500,
                                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                              }}
                            >
                              {h.type === "status"
                                ? h.status
                                  ? "Completed"
                                  : "Reopened"
                                : h.type === "edit"
                                ? "Edited"
                                : "Created"}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{
                                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                                lineHeight: 1.2,
                              }}
                            >
                              by {h.performedBy.name} on{" "}
                              {new Date(h.modifiedAt).toLocaleDateString()} at{" "}
                              {new Date(h.modifiedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Collapse>
              
              {index < goals.length - 1 && <Divider />}
            </Box>
          );
        })}
      </List>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6" component="span">
              Edit Goal
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              inputRef={titleRef}
              label="Goal Title"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onKeyPress={e => handleKeyPress(e, descRef)}
              fullWidth
              disabled={isSaving}
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
              value={editedDesc}
              onChange={e => setEditedDesc(e.target.value)}
              onKeyPress={e => handleKeyPress(e, deadlineRef)}
              multiline
              minRows={3}
              fullWidth
              disabled={isSaving}
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
            
            <FormControl fullWidth disabled={isSaving}>
              <InputLabel>Priority</InputLabel>
              <Select
                inputRef={priorityRef}
                value={editedPriority}
                label="Priority"
                onChange={(e) => setEditedPriority(e.target.value)}
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
              value={editedDeadline}
              onChange={e => setEditedDeadline(e.target.value)}
              onKeyPress={e => handleKeyPress(e, null)}
              fullWidth
              disabled={isSaving}
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
            onClick={() => setEditDialogOpen(false)}
            disabled={isSaving}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={
              isSaving ||
              !editedTitle.trim() ||
              (editedTitle.trim() === (currentGoal?.title?.trim() ?? "") &&
                editedDesc.trim() === (currentGoal?.description?.trim() ?? "") &&
                editedDeadline === (currentGoal?.deadline?.slice(0, 10) ?? ""))
            }
            sx={{
              borderRadius: 2,
              minWidth: 80,
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
