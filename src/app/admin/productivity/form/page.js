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
  Fade,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { useUser } from "@clerk/nextjs";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

export default function ProductivityForm() {
  const { user } = useUser();
  const theme = useTheme();
  
  // Refs for auto-focus
  const todayWorkRef = useRef(null);
  const tomorrowGoalRef = useRef(null);
  const reasonLowRatingRef = useRef(null);
  const reasonNotAchievingRef = useRef(null);

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
  const [currentStep, setCurrentStep] = useState(0);

  const isFormIncomplete =
    !form.todayWork.trim() ||
    !form.tomorrowGoal.trim() ||
    !form.efficiencyRating ||
    (form.efficiencyRating <= 3 && !form.reasonLowRating.trim()) ||
    (!form.willAchieveGoal && !form.reasonNotAchieving.trim());

  const isEqualToExisting = existingEntry && Object.keys(existingEntry).every(key => existingEntry[key] === form[key]);

  // Auto-focus management
  const focusNext = useCallback((currentRef, nextRef) => {
    if (nextRef?.current) {
      nextRef.current.focus();
    }
  }, []);

  // Handle Enter key navigation
  const handleKeyPress = useCallback((e, nextRef) => {
    if (e.key === 'Enter' && !e.shiftKey && nextRef) {
      e.preventDefault();
      focusNext(null, nextRef);
    }
  }, [focusNext]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && todayWorkRef.current) {
      setTimeout(() => {
        todayWorkRef.current.focus();
      }, 100);
    }
  }, [isEditing]);

  // Fetch existing data
  useEffect(() => {
    const fetchExisting = async () => {
      if (!user) return;

      setInitialFetching(true);
      try {
        const today = dayjs().format("YYYY-MM-DD");
        const res = await axios.get(`/api/productivity?date=${today}&clerkUserId=${user.id}`);
        const data = Object.values(res.data.submissions)?.[0];

        if (data) {
          const newEntry = {
            todayWork: data.todayWork || "",
            tomorrowGoal: data.tomorrowGoal || "",
            efficiencyRating: data.efficiencyRating || 0,
            reasonLowRating: data.reasonLowRating || "",
            willAchieveGoal: data.willAchieveGoal ?? true,
            reasonNotAchieving: data.reasonNotAchieving || "",
          };

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

  const formSteps = [
    { label: "Today's Work", field: "todayWork" },
    { label: "Tomorrow's Goal", field: "tomorrowGoal" },
    { label: "Efficiency Rating", field: "efficiencyRating" },
    { label: "Additional Info", field: "additional" },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        py: { xs: 3, md: 6 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Daily Productivity
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 400,
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Track your progress, reflect on achievements, and set tomorrow&apos;s goals
            </Typography>
          </Box>
        </Fade>

        {/* Main Content */}
        <Fade in timeout={1000}>
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
              p: { xs: 3, md: 6 },
              maxWidth: 800,
              mx: 'auto',
              position: 'relative',
              overflow: 'hidden',
              transform: 'translateY(0)',
              animation: 'slideUp 1s ease-out',
              '@keyframes slideUp': {
                '0%': {
                  transform: 'translateY(40px)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateY(0)',
                  opacity: 1,
                },
              },
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
            {initialFetching ? (
              <Box sx={{ 
                display: "flex", 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: "center", 
                py: 8,
                gap: 3
              }}>
                <CircularProgress 
                  size={48}
                  sx={{
                    color: '#3b82f6',
                  }}
                />
                <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Loading your data...
                </Typography>
              </Box>
            ) : !isEditing && existingEntry ? (
              <ReadOnlyView 
                existingEntry={existingEntry} 
                onEdit={() => setIsEditing(true)}
                loading={disableAll}
              />
            ) : (
              <EditableForm
                form={form}
                setForm={setForm}
                handleSubmit={handleSubmit}
                handleKeyPress={handleKeyPress}
                refs={{
                  todayWorkRef,
                  tomorrowGoalRef,
                  reasonLowRatingRef,
                  reasonNotAchievingRef,
                }}
                loading={loading}
                isFormIncomplete={isFormIncomplete}
                isEqualToExisting={isEqualToExisting}
                existingEntry={existingEntry}
                onCancel={() => setIsEditing(false)}
                disableAll={disableAll}
              />
            )}
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}

// Read-only view component
function ReadOnlyView({ existingEntry, onEdit, loading }) {
  return (
    <Fade in timeout={600}>
      <Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 4
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 32 }} />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Submission Complete
            </Typography>
          </Box>
          <IconButton
            onClick={onEdit}
            disabled={loading}
            sx={{
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6',
              '&:hover': {
                bgcolor: 'rgba(59, 130, 246, 0.2)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <EditIcon />
          </IconButton>
        </Box>

        <Stack spacing={4}>
          <InfoCard
            icon="📋"
            title="Today's Work"
            content={existingEntry.todayWork}
          />
          
          <InfoCard
            icon="🎯"
            title="Tomorrow's Goal"
            content={existingEntry.tomorrowGoal}
          />
          
          <InfoCard
            icon="⭐"
            title="Efficiency Rating"
            content={
              <Rating 
                value={existingEntry.efficiencyRating} 
                precision={0.5} 
                readOnly 
                sx={{ 
                  '& .MuiRating-iconFilled': { color: '#fbbf24' },
                  '& .MuiRating-iconEmpty': { color: 'rgba(255, 255, 255, 0.3)' },
                }}
              />
            }
          />

          {existingEntry.efficiencyRating <= 3 && existingEntry.reasonLowRating && (
            <InfoCard
              icon="💭"
              title="Reason for Low Rating"
              content={existingEntry.reasonLowRating}
            />
          )}

          <InfoCard
            icon="⏰"
            title="Goal Achievement"
            content={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {existingEntry.willAchieveGoal ? (
                  <>
                    <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                    <Typography sx={{ color: '#22c55e', fontWeight: 500 }}>
                      Will achieve goal in deadline
                    </Typography>
                  </>
                ) : (
                  <>
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      !
                    </Box>
                    <Typography sx={{ color: '#ef4444', fontWeight: 500 }}>
                      May not achieve goal in deadline
                    </Typography>
                  </>
                )}
              </Box>
            }
          />

          {!existingEntry.willAchieveGoal && existingEntry.reasonNotAchieving && (
            <InfoCard
              icon="⚠️"
              title="Reason for Concern"
              content={existingEntry.reasonNotAchieving}
            />
          )}
        </Stack>
      </Box>
    </Fade>
  );
}

// Info card component
function InfoCard({ icon, title, content }) {
  return (
    <Box
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Typography sx={{ fontSize: 24, lineHeight: 1 }}>{icon}</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
              mb: 1,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
          {typeof content === 'string' ? (
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.6,
              }}
            >
              {content}
            </Typography>
          ) : (
            content
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Editable form component
function EditableForm({ 
  form, 
  setForm, 
  handleSubmit, 
  handleKeyPress, 
  refs, 
  loading, 
  isFormIncomplete, 
  isEqualToExisting, 
  existingEntry, 
  onCancel, 
  disableAll 
}) {
  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <Fade in timeout={600}>
      <Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          mb: 6
        }}>
          <TrendingUpIcon sx={{ color: '#3b82f6', fontSize: 32 }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            {existingEntry ? 'Update Your Progress' : 'Submit Your Progress'}
          </Typography>
        </Box>

        <Stack spacing={5}>
          {/* Today's Work */}
          <FormSection>
            <TextField
              inputRef={refs.todayWorkRef}
              label="What did you accomplish today?"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              value={form.todayWork}
              onChange={e => handleChange("todayWork", e.target.value)}
              onKeyPress={e => handleKeyPress(e, refs.tomorrowGoalRef)}
              disabled={disableAll}
              placeholder="Describe your key achievements, tasks completed, and progress made..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 3,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    transition: 'border-color 0.2s ease',
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
          </FormSection>

          {/* Tomorrow's Goal */}
          <FormSection>
            <TextField
              inputRef={refs.tomorrowGoalRef}
              label="What's your goal for tomorrow?"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              value={form.tomorrowGoal}
              onChange={e => handleChange("tomorrowGoal", e.target.value)}
              disabled={disableAll}
              placeholder="Outline your priorities, objectives, and planned outcomes..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 3,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    transition: 'border-color 0.2s ease',
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
          </FormSection>

          {/* Efficiency Rating */}
          <FormSection>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 600,
                mb: 2,
                letterSpacing: '-0.01em',
              }}
            >
              Rate your efficiency today
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 3,
              p: 3,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
            }}>
              <Rating
                value={form.efficiencyRating}
                onChange={(_e, newValue) => handleChange("efficiencyRating", newValue)}
                disabled={disableAll}
                size="large"
                sx={{
                  '& .MuiRating-iconFilled': { 
                    color: '#fbbf24',
                    filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))',
                  },
                  '& .MuiRating-iconEmpty': { 
                    color: 'rgba(255, 255, 255, 0.2)',
                  },
                  '& .MuiRating-iconHover': {
                    color: '#fbbf24',
                  },
                }}
              />
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  ml: 2,
                  fontWeight: 500,
                }}
              >
                {form.efficiencyRating ? `${form.efficiencyRating}/5` : 'Select rating'}
              </Typography>
            </Box>
          </FormSection>

          {/* Conditional: Reason for low rating */}
          {form.efficiencyRating > 0 && form.efficiencyRating <= 3 && (
            <Box
              sx={{
                opacity: 1,
                transform: 'translateY(0)',
                animation: 'fadeInUp 0.4s ease-out',
                '@keyframes fadeInUp': {
                  '0%': {
                    opacity: 0,
                    transform: 'translateY(20px)',
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translateY(0)',
                  },
                },
              }}
            >
              <FormSection>
                <TextField
                  inputRef={refs.reasonLowRatingRef}
                  label="What affected your efficiency today?"
                  multiline
                  rows={3}
                  fullWidth
                  variant="outlined"
                  value={form.reasonLowRating}
                  onChange={e => handleChange("reasonLowRating", e.target.value)}
                  disabled={disableAll}
                  placeholder="Share what challenges or obstacles impacted your productivity..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 3,
                      '& fieldset': {
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        transition: 'border-color 0.2s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#ef4444',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#ef4444',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#ffffff',
                    },
                  }}
                />
              </FormSection>
            </Box>
          )}

          {/* Goal Achievement */}
          <FormSection>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.willAchieveGoal}
                  onChange={e => handleChange("willAchieveGoal", e.target.checked)}
                  disabled={disableAll}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.3)',
                    '&.Mui-checked': {
                      color: '#22c55e',
                    },
                    '& .MuiSvgIcon-root': {
                      fontSize: 24,
                    },
                  }}
                />
              }
              label={
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                  }}
                >
                  I will achieve tomorrow&apos;s goal within the deadline
                </Typography>
              }
              sx={{ mb: 2 }}
            />
          </FormSection>

          {/* Conditional: Reason for not achieving */}
          {!form.willAchieveGoal && (
            <Box
              sx={{
                opacity: 1,
                transform: 'translateY(0)',
                animation: 'fadeInUp 0.4s ease-out',
                '@keyframes fadeInUp': {
                  '0%': {
                    opacity: 0,
                    transform: 'translateY(20px)',
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translateY(0)',
                  },
                },
              }}
            >
              <FormSection>
                <TextField
                  inputRef={refs.reasonNotAchievingRef}
                  label="What might prevent you from achieving your goal?"
                  multiline
                  rows={3}
                  fullWidth
                  variant="outlined"
                  value={form.reasonNotAchieving}
                  onChange={e => handleChange("reasonNotAchieving", e.target.value)}
                  disabled={disableAll}
                  placeholder="Identify potential challenges and how you plan to address them..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 3,
                      '& fieldset': {
                        borderColor: 'rgba(245, 158, 11, 0.3)',
                        transition: 'border-color 0.2s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(245, 158, 11, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#f59e0b',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#f59e0b',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#ffffff',
                    },
                  }}
                />
              </FormSection>
            </Box>
          )}

          {/* Submit Actions */}
          <Box sx={{ pt: 4 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                disabled={disableAll || isFormIncomplete || isEqualToExisting}
                onClick={handleSubmit}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AssignmentTurnedInIcon />}
                sx={{
                  px: 6,
                  py: 2,
                  borderRadius: 3,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  background: isFormIncomplete || isEqualToExisting 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: isFormIncomplete || isEqualToExisting ? 'rgba(255, 255, 255, 0.5)' : '#ffffff',
                  border: 'none',
                  boxShadow: isFormIncomplete || isEqualToExisting 
                    ? 'none' 
                    : '0 8px 32px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    background: isFormIncomplete || isEqualToExisting 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                    transform: isFormIncomplete || isEqualToExisting ? 'none' : 'translateY(-2px)',
                    boxShadow: isFormIncomplete || isEqualToExisting 
                      ? 'none' 
                      : '0 12px 40px rgba(59, 130, 246, 0.4)',
                  },
                  '&:disabled': {
                    color: 'rgba(255, 255, 255, 0.3)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? 'Submitting...' : existingEntry ? 'Update Progress' : 'Submit Progress'}
              </Button>

              {existingEntry && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onCancel}
                  disabled={disableAll}
                  sx={{
                    px: 4,
                    py: 2,
                    borderRadius: 3,
                    fontWeight: 500,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancel
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Fade>
  );
}

// Form section wrapper
function FormSection({ children }) {
  return (
    <Box
      sx={{
        position: 'relative',
        '&:hover': {
          '& > *': {
            transform: 'translateY(-1px)',
          },
        },
        '& > *': {
          transition: 'transform 0.2s ease',
        },
      }}
    >
      {children}
    </Box>
  );
}
