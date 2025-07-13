"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
  Rating,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { useUser } from "@clerk/nextjs";

export default function ProductivityForm() {
  const { user } = useUser();

  const [form, setForm] = useState({
    todayWork: "",
    tomorrowGoal: "",
    efficiencyRating: 0,
    reasonLowRating: "",
    willAchieveGoal: true,
    reasonNotAchieving: "",
  });

  const [loading, setLoading] = useState(false);
  const [initialFetching, setInitialFetching] = useState(true);
  const [existingEntry, setExistingEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const isFormIncomplete =
    !form.todayWork.trim() ||
    !form.tomorrowGoal.trim() ||
    !form.efficiencyRating ||
    (form.efficiencyRating <= 3 && !form.reasonLowRating.trim()) ||
    (!form.willAchieveGoal && !form.reasonNotAchieving.trim());

  const isEqualToExisting = existingEntry && Object.keys(existingEntry).every(key => existingEntry[key] === form[key]);

  // Fetch existing data
  useEffect(() => {
    const fetchExisting = async () => {
      if (!user) return;

      setInitialFetching(true);
      try {
        const today = dayjs().format("YYYY-MM-DD");
        const res = await axios.get(`/api/productivity?date=${today}&clerkUserId=${user.id}`);
        const data = Object.values(res.data.submissions)[0];

        const newEntry = {
          todayWork: data.todayWork,
          tomorrowGoal: data.tomorrowGoal,
          efficiencyRating: data.efficiencyRating,
          reasonLowRating: data.reasonLowRating ?? "",
          willAchieveGoal: data.willAchieveGoal,
          reasonNotAchieving: data.reasonNotAchieving ?? "",
        };

        if (data) {
          setForm(newEntry);
          setExistingEntry(newEntry);
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      } catch (err) {
        console.error("Error fetching existing form:", err);
        setIsEditing(true);
      } finally {
        setInitialFetching(false);
      }
    };

    fetchExisting();
  }, [user]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async () => {
    if (isFormIncomplete) {
      alert("Please fill out all required fields.");
      return;
    }
    setLoading(true);
    try {
      if (existingEntry) {
        await axios.patch("/api/productivity", form);
        setExistingEntry(form);
        alert("Updated successfully!");
      } else {
        await axios.post("/api/productivity", form);
        alert("Submitted successfully!");
        setExistingEntry(form);
      }
      setIsEditing(false);
    } catch (error) {
      alert(error.response?.data?.message ?? "An error occurred while submitting");
    } finally {
      setLoading(false);
    }
  };

  const disableAll = loading || initialFetching;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Card
        sx={{
          bgcolor: "#1a1a1a",
          color: "#fff",
          borderRadius: 3,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          p: 3,
        }}
      >
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            ✨ Daily Productivity Check-in
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Share your daily updates and tomorrow&apos;s goals
          </Typography>

          <Divider sx={{ my: 3, borderColor: "#333" }} />

          {initialFetching ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : !isEditing ? (
            <>
              <Box
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 2,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    📌 What did you work on today?
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    {existingEntry.todayWork}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    🎯 What is your goal for tomorrow?
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    {existingEntry.tomorrowGoal}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    ⭐ Efficiency Rating
                  </Typography>
                  <Rating value={existingEntry.efficiencyRating} precision={0.5} readOnly />
                </Box>

                {existingEntry.efficiencyRating <= 3 && existingEntry.reasonLowRating && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      💬 Reason for low rating
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                      {existingEntry.reasonLowRating}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    ⏰ Will achieve goal in deadline?
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    {existingEntry.willAchieveGoal ? "✅ Yes" : "❌ No"}
                  </Typography>
                </Box>

                {!existingEntry.willAchieveGoal && existingEntry.reasonNotAchieving && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      ⚠️ Reason for not achieving
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                      {existingEntry.reasonNotAchieving}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Button
                variant="outlined"
                color="primary"
                size="large"
                sx={{ mt: 3 }}
                onClick={() => setIsEditing(true)}
                disabled={disableAll}
              >
                Update
              </Button>
            </>
          ) : (
            <Stack spacing={3}>
              <TextField
                label="What did you work on today?"
                multiline
                fullWidth
                variant="outlined"
                value={form.todayWork}
                onChange={e => handleChange("todayWork", e.target.value)}
                disabled={disableAll}
                sx={{ bgcolor: "#2a2a2a", input: { color: "#fff" }, textarea: { color: "#fff" } }}
                InputLabelProps={{ style: { color: "#ccc" } }}
              />

              <TextField
                label="What is your goal for tomorrow?"
                multiline
                fullWidth
                variant="outlined"
                value={form.tomorrowGoal}
                onChange={e => handleChange("tomorrowGoal", e.target.value)}
                disabled={disableAll}
                sx={{ bgcolor: "#2a2a2a", input: { color: "#fff" }, textarea: { color: "#fff" } }}
                InputLabelProps={{ style: { color: "#ccc" } }}
              />

              <Box>
                <Typography gutterBottom>🔥 Rate your work efficiency today out of 5</Typography>
                <Rating
                  value={form.efficiencyRating}
                  onChange={(_e, newValue) => handleChange("efficiencyRating", newValue)}
                  disabled={disableAll}
                />
              </Box>

              {form.efficiencyRating <= 3 && (
                <TextField
                  label="Why rated 3 or less"
                  multiline
                  fullWidth
                  variant="outlined"
                  value={form.reasonLowRating}
                  onChange={e => handleChange("reasonLowRating", e.target.value)}
                  disabled={disableAll}
                  sx={{ bgcolor: "#2a2a2a", input: { color: "#fff" }, textarea: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#ccc" } }}
                />
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.willAchieveGoal}
                    onChange={e => handleChange("willAchieveGoal", e.target.checked)}
                    disabled={disableAll}
                    sx={{ color: "#1d72b8", "&.Mui-checked": { color: "#1d72b8" } }}
                  />
                }
                label="I will achieve this goal in deadline"
              />

              {!form.willAchieveGoal && (
                <TextField
                  label="If not, why?"
                  multiline
                  fullWidth
                  variant="outlined"
                  value={form.reasonNotAchieving}
                  onChange={e => handleChange("reasonNotAchieving", e.target.value)}
                  disabled={disableAll}
                  sx={{ bgcolor: "#2a2a2a", input: { color: "#fff" }, textarea: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#ccc" } }}
                />
              )}

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  disabled={disableAll || isFormIncomplete || isEqualToExisting}
                  onClick={handleSubmit}
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>

                {existingEntry && (
                  <Button variant="text" color="secondary" onClick={() => setIsEditing(false)} disabled={disableAll}>
                    Cancel
                  </Button>
                )}
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
