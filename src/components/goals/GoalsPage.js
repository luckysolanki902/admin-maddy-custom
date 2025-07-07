"use client";

import { useEffect, useState } from "react";
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Goals from "@/components/goals/Goals";
import { useUser } from "@clerk/nextjs";

export default function AdminGoalsPage({ department }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useUser();
  const isAllowed = user?.primaryEmailAddress?.emailAddress === "priyanshuyadav0404@gmail.com";

  useEffect(() => {
    async function fetchGoals() {
      setLoading(true);
      try {
        const res = await fetch(`/api/goals?department=${encodeURIComponent(department)}`);
        const data = await res.json();
        setGoals(data.goals || []);
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGoals();
  }, [department]);

  const handleAddGoal = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          department,
          deadline: newDeadline,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setGoals(prev => [data.goal, ...prev]);
        setNewTitle("");
        setNewDesc("");
        setNewDeadline("");
        setOpenDialog(false);
      }
    } catch (err) {
      console.error("Add goal failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pt: 8, pb: 4, px: 2 }}>
        <Container maxWidth={{ xs: "md", lg: "md" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              mb: 4,
              gap: 2,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: "bold",
                textTransform: "capitalize",
                fontFamily: "Jost, Arial, sans-serif",
              }}
            >
              🎯 {department} Goals
            </Typography>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              disabled={!isAllowed}
              sx={{
                ...(isAllowed ? {} : { display: "none" }),
                borderRadius: 2,
                fontWeight: 600,
                px: 3,
                py: 2,
                mt: { xs: 2, md: 0 },
                alignSelf: { xs: "stretch", sm: "stretch", md: "unset" },
              }}
            >
              Add Goal
            </Button>
          </Box>

          {loading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
              ))}
            </>
          ) : goals.length ? (
            <Goals isAllowed={isAllowed} goals={goals} setGoals={setGoals} />
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 200,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: "text.secondary",
                  fontWeight: "medium",
                }}
              >
                <i>No goals yet</i> 🥲
              </Typography>
            </Box>
          )}
        </Container>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>📝 Create a New Goal</DialogTitle>
          <Divider />
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Goal Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              fullWidth
              disabled={isSubmitting}
            />
            <TextField
              label="Description"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              disabled={isSubmitting}
            />
            <TextField
              label="Deadline"
              type="date"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
              fullWidth
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddGoal} variant="contained" disabled={!newTitle.trim() || isSubmitting}>
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
