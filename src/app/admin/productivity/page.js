"use client";

import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Grid,
  Divider,
  Stack,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Rating,
  Skeleton,
} from "@mui/material";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { departmentAdmins } from "@/lib/constants/user";

export default function ProductivityOverview() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState([]);

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

  // Define bento layout pattern
  const bentoSizes = [
    { xs: 12, md: 6 }, // Big card
    { xs: 12, md: 6 }, // Big card
    { xs: 12, md: 4 }, // Smaller card
    { xs: 12, md: 8 }, // Wider card
    // ... you can repeat or adjust pattern
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        📊 Productivity Submissions Overview
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        View department submissions by date
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ my: 3 }}>
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={newValue => setSelectedDate(newValue)}
          maxDate={dayjs()}
          format="YYYY-MM-DD"
        />

        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Departments</InputLabel>
          <Select
            multiple
            value={selectedDepts}
            onChange={e => setSelectedDepts(e.target.value)}
            label="Departments"
            renderValue={selected => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map(value => (
                  <Chip key={value} label={value.toUpperCase()} />
                ))}
              </Box>
            )}
          >
            {departments.map(dept => (
              <MenuItem key={dept} value={dept}>
                {dept.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Divider sx={{ mb: 3, borderColor: "#333" }} />

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Grid item key={index}>
                <Skeleton
                  variant="rectangular"
                  sx={{
                    bgcolor: "#2a2a2a",
                    borderRadius: 3,
                    height: 300,
                  }}
                />
              </Grid>
            ))
          : displayedDepartments.map((dept, index) => {
              const submission = submissions[dept];

              return (
                <Grid item xs={12} md={6} key={dept}>
                  <Card
                    sx={{
                      bgcolor: "linear-gradient(135deg, #1a1a1a 0%, #232323 100%)",
                      color: "#fff",
                      borderRadius: 3,
                      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                      },
                    }}
                  >
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: "#1d72b8", letterSpacing: 1 }}>
                        {dept.toUpperCase()}
                      </Typography>

                      {submission ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: "success.light",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            ✅ Submitted by {submission.user.name}
                          </Typography>

                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                            Submitted on: {dayjs(submission.createdAt).format("DD MMM YYYY, hh:mm A")}
                          </Typography>

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
                                {submission.todayWork}
                              </Typography>
                            </Box>

                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                🎯 What is your goal for tomorrow?
                              </Typography>
                              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {submission.tomorrowGoal}
                              </Typography>
                            </Box>

                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                ⭐ Efficiency Rating
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Rating value={submission.efficiencyRating} precision={0.5} readOnly />
                              </Box>
                            </Box>

                            {submission.efficiencyRating <= 3 && submission.reasonLowRating && (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  💬 Reason for low rating
                                </Typography>
                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                  {submission.reasonLowRating}
                                </Typography>
                              </Box>
                            )}

                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                ⏰ Will achieve goal in deadline?
                              </Typography>
                              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {submission.willAchieveGoal ? "✅ Yes" : "❌ No"}
                              </Typography>
                            </Box>

                            {!submission.willAchieveGoal && submission.reasonNotAchieving && (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  ⚠️ Reason for not achieving
                                </Typography>
                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                  {submission.reasonNotAchieving}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
                          ❌ Not submitted
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
      </Grid>
    </Container>
  );
}
