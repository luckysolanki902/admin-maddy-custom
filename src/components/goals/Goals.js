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
} from "@mui/material";
import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";

export default function Goals({ goals, setGoals, isAllowed }) {
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDesc, setEditedDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const openEditDialog = goal => {
    setCurrentGoal(goal);
    setEditedTitle(goal.title ?? "");
    setEditedDesc(goal.description ?? "");
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!currentGoal) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/goals/${currentGoal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          description: editedDesc,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setGoals(prev => prev.map(g => (g._id === data.goal._id ? data.goal : g)));
      }
    } catch (err) {
      console.error("Failed to edit goal", err);
    } finally {
      setIsSaving(false);
      setEditDialogOpen(false);
      setCurrentGoal(null);
    }
  };

  const handleToggle = async (goalId, newStatus) => {
    setTogglingId(goalId);
    try {
      const res = await fetch(`/api/goals/${goalId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoals(prev => prev.map(g => (g._id === data.goal._id ? data.goal : g)));
      }
    } catch (err) {
      console.error("Toggle error", err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Paper elevation={3} sx={{ pb: 4, borderRadius: 3, bgcolor: "background.paper" }}>
      {/* <Typography variant="h5" gutterBottom>
        Your Goals
      </Typography> */}

      <List>
        {goals.map(goal => {
          const isExpanded = expandedGoalId === goal._id;
          const isToggling = togglingId === goal._id;

          return (
            <Box key={goal._id}>
              <ListItem>
                <Checkbox
                  checked={goal.isCompleted}
                  disabled={!isAllowed || isToggling}
                  onChange={() => handleToggle(goal._id, !goal.isCompleted)}
                />
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ textDecoration: goal.isCompleted ? "line-through" : "none" }}>
                      {goal.title}
                    </Typography>
                  }
                  secondary={goal.description}
                  sx={{ maxWidth: { xs: "100%", md: "calc(100% - 5rem)" } }}
                />
                <ListItemSecondaryAction sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
                  <IconButton onClick={() => openEditDialog(goal)} disabled={!isAllowed || isToggling}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setExpandedGoalId(isExpanded ? null : goal._id)}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>

              <Collapse in={isExpanded}>
                <Box sx={{ ml: 4, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    History
                  </Typography>
                  {goal.history.length === 0 ? (
                    <Typography variant="body2" color="text.disabled">
                      No history yet
                    </Typography>
                  ) : (
                    <List dense>
                      {goal.history.map((h, idx) => (
                        <ListItem key={idx} alignItems="flex-start">
                          <ListItemText
                            primary={
                              h.type === "status" ? (
                                <>
                                  {h.status ? "✔️ Marked as Completed " : "❌ Marked as Incomplete "}
                                  <>
                                    by <b>{h.performedBy.name}</b>
                                  </>
                                </>
                              ) : h.type === "edit" ? (
                                "✏️ Edited Goal"
                              ) : h.type === "created" ? (
                                <>
                                  🆕 Created{" "}
                                  <>
                                    by <b>{h.performedBy.name}</b>
                                  </>
                                </>
                              ) : null
                            }
                            secondary={
                              h.type === "status" ? (
                                new Date(h.modifiedAt).toLocaleString([], {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              ) : h.type === "edit" ? (
                                <>
                                  <Typography variant="caption" color="text.secondary" component="span" display="block">
                                    Changed on{" "}
                                    {new Date(h.modifiedAt).toLocaleString([], {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                    <>
                                      {" "}
                                      by <b>{h.performedBy.name}</b>
                                    </>
                                  </Typography>
                                  {h.oldValue.title !== h.newValue.title && (
                                    <Typography variant="body2" component="span" display="block">
                                      • <b>Title:</b> &quot;{h.oldValue.title}&quot; → &quot;{h.newValue.title}&quot;
                                    </Typography>
                                  )}
                                  {h.oldValue.description !== h.newValue.description && (
                                    <Typography variant="body2" component="span" display="block">
                                      • <b>Description:</b> &quot;{h.oldValue.description}&quot; → &quot;{h.newValue.description}
                                      &quot;
                                    </Typography>
                                  )}
                                </>
                              ) : h.type === "created" ? (
                                <>
                                  <Typography variant="caption" color="text.secondary" component="span" display="block">
                                    Created on{" "}
                                    {new Date(h.modifiedAt).toLocaleString([], {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </Typography>

                                  <Typography variant="body2" component="span" display="block">
                                    • <b>Title:</b> &quot;{h.newValue.title}&quot;
                                  </Typography>

                                  <Typography variant="body2" component="span" display="block">
                                    • <b>Description:</b> &quot;{h.newValue.description}&quot;
                                  </Typography>
                                </>
                              ) : null
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </Collapse>
              <Divider />
            </Box>
          );
        })}
      </List>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>✏️ Edit Goal</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Goal Title"
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            fullWidth
            disabled={isSaving}
          />
          <TextField
            label="Description"
            value={editedDesc}
            onChange={e => setEditedDesc(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={isSaving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={
              isSaving ||
              !editedTitle.trim() ||
              (editedTitle.trim() === (currentGoal?.title?.trim() ?? "") &&
                editedDesc.trim() === (currentGoal?.description?.trim() ?? ""))
            }
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
