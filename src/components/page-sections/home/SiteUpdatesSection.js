"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useUser } from "@clerk/nextjs";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { DateTimePicker } from "@mui/x-date-pickers";
import { createSiteUpdate, fetchSiteUpdates, patchSiteUpdate } from "@/redux/slices/siteUpdatesSlice";

const AUTHORIZED_EMAILS = new Set([
  "luckysolanki902@gmail.com",
  "sahilyadavind0908@gmail.com",
]);

const ACCENT_COLOR = "rgba(148, 163, 184, 0.42)";

const dialogFieldStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 14,
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.9)',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.12)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(147,51,234,0.35)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(147,51,234,0.55)',
      boxShadow: '0 0 0 3px rgba(147,51,234,0.15)',
    },
  },
  '& .MuiInputBase-input': {
    color: 'rgba(255,255,255,0.92)',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.65)',
    '&.Mui-focused': {
      color: 'rgba(255,255,255,0.9)',
    },
  },
};

function useIsAuthorized(email) {
  return useMemo(() => (email ? AUTHORIZED_EMAILS.has(email.toLowerCase()) : false), [email]);
}

function prepareDisplayUpdates(items) {
  if (!items?.length) return [];
  return [...items].sort((a, b) => new Date(b.effectiveAt) - new Date(a.effectiveAt));
}

function formatUpdateTimestamp(value) {
  return dayjs(value).format("DD MMM YYYY · HH:mm");
}

export default function SiteUpdatesSection() {
  const dispatch = useDispatch();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const isAuthorized = useIsAuthorized(email);

  const { items, status, nextCursor, hasMore, loadingMore, error: updatesError } = useSelector((state) => state.siteUpdates);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchSiteUpdates({ pageSize: 3 }));
    }
  }, [dispatch, status]);

  const updates = useMemo(() => prepareDisplayUpdates(items), [items]);

  const [loadMoreError, setLoadMoreError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [dialogLoading, setDialogLoading] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [dateOption, setDateOption] = useState("today");
  const [dateValue, setDateValue] = useState(dayjs());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor) return;
    setLoadMoreError("");
    try {
      await dispatch(fetchSiteUpdates({ cursor: nextCursor, pageSize: 10 })).unwrap();
    } catch (error) {
      const message = typeof error === "string" ? error : error?.message || "Unable to load more updates.";
      setLoadMoreError(message);
    }
  };

  const handleOpenDialog = (update = null) => {
    if (update) {
      setEditingUpdate(update);
      setTitle(update.title);
      setDescription(update.description);
      setDateValue(dayjs(update.effectiveAt));
      setDateOption("custom");
    } else {
      setEditingUpdate(null);
      setTitle("");
      setDescription("");
      setDateOption("today");
      setDateValue(dayjs());
    }
    setDialogError("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (dialogLoading) return;
    setDialogOpen(false);
  };

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingUpdate) return;
    if (dateOption === "today") {
      setDateValue(dayjs());
    } else if (dateOption === "yesterday") {
      setDateValue(dayjs().subtract(1, "day"));
    }
  }, [dateOption, dialogOpen, editingUpdate]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setDialogError("Both title and description are required.");
      return;
    }

    if (!dateValue || !dateValue.isValid()) {
      setDialogError("Choose a valid effective date and time.");
      return;
    }

    setDialogLoading(true);
    setDialogError("");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      effectiveAt: dateValue.toISOString(),
    };

    try {
      if (editingUpdate?._id) {
        await dispatch(patchSiteUpdate({ id: editingUpdate._id, payload })).unwrap();
      } else {
        await dispatch(createSiteUpdate(payload)).unwrap();
      }
      setDialogOpen(false);
    } catch (error) {
      setDialogError(error || "Something went wrong.");
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <Box
      sx={{
        mt: 4,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        position: "relative",
        background: "rgba(28,28,28,0.85)",
        borderRadius: 3,
        border: "1px solid rgba(255,255,255,0.04)",
        p: { xs: 2, md: 2.75 },
        backdropFilter: "blur(16px)",
        overflow: "hidden",
        '&::before': {
          content: '""',
          position: "absolute",
          inset: "0 0 auto 0",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`
        }
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography sx={{ fontSize: "0.68rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(207,210,214,0.68)", fontWeight: 600 }}>
            Main site (D2C)
          </Typography>
          <Typography sx={{ mt: 0.4, color: "rgba(235,235,235,0.9)", fontWeight: 600, fontSize: "1.05rem" }}>
            3 Most recent major updates
          </Typography>
        </Box>
        {isAuthorized && (
          <Button
            startIcon={<AddRoundedIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              letterSpacing: "0.02em",
              px: 2.4,
              height: 40,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              color: "rgba(240,240,240,0.85)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "none",
              '&:hover': {
                background: "rgba(255,255,255,0.12)",
                borderColor: "rgba(255,255,255,0.2)",
              }
            }}
          >
            Add
          </Button>
        )}
      </Stack>

      {updates.length ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1.5,
            overflowX: "auto",
            pb: 1,
            scrollSnapType: { xs: "x mandatory", md: "none" },
            pr: { xs: 1, md: 0 },
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              background: "rgba(255,255,255,0.1)",
              borderRadius: 999,
            },
          }}
        >
          {updates.map((update, index) => (
            <Card
              key={update._id}
              sx={{
                flex: { xs: "0 0 220px", md: "0 0 320px", lg: "0 0 380px" },
                background: "rgba(40,40,40,0.88)",
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.06)",
                position: "relative",
                overflow: "hidden",
                scrollSnapAlign: "start",
                '&::before': {
                  content: '""',
                  position: "absolute",
                  inset: "0 0 auto 0",
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)`
                }
              }}
            >
              <CardContent sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 1.2, p: 2 }}>
                {index === 0 && (
                  <Box
                    sx={{
                      alignSelf: "flex-start",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 0.9,
                      py: 0.28,
                      borderRadius: 10,
                      fontSize: "0.58rem",
                      textTransform: "uppercase",
                      color: "rgba(212,255,235,0.85)",
                      background: "rgba(34, 197, 94, 0.12)",
                      border: "1px solid rgba(34,197,94,0.22)",
                      fontWeight: 600,
                      letterSpacing: "0.09em",
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: "rgba(34,197,94,0.85)",
                      }}
                    />
                    Latest
                  </Box>
                )}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(120,120,120,0.22)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <EventOutlinedIcon sx={{ color: "rgba(230,230,230,0.78)", fontSize: 17 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(210,214,220,0.6)", fontWeight: 600 }}>
                        {formatUpdateTimestamp(update.effectiveAt)}
                      </Typography>
                      <Typography sx={{ color: "rgba(240,240,240,0.9)", mt: 0.35, fontWeight: 600, fontSize: "0.9rem" }}>
                        {update.title}
                      </Typography>
                    </Box>
                  </Stack>
                  {isAuthorized && (
                    <Tooltip title="Edit update">
                      <IconButton size="small" onClick={() => handleOpenDialog(update)} sx={{ color: "rgba(245,245,245,0.65)" }}>
                        <EditOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.05)" }} />

                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <DescriptionOutlinedIcon sx={{ color: "rgba(207,207,207,0.65)", fontSize: 18, mt: 0.2 }} />
                  <Typography
                    sx={{
                      color: "rgba(228,228,228,0.78)",
                      lineHeight: 1.6,
                      fontSize: "0.82rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {update.description}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            minHeight: 120,
            borderRadius: 2,
            border: "1px dashed rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(215,215,215,0.55)",
            fontStyle: "italic",
            fontSize: "0.85rem",
          }}
        >
          {status === "loading" ? "Fetching recent updates..." : updatesError || "No updates published yet."}
        </Box>
      )}

      {(hasMore || loadMoreError) && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="flex-end"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          {loadMoreError && (
            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
              {loadMoreError}
            </Typography>
          )}
          {hasMore && (
            <Button
              onClick={handleLoadMore}
              disabled={loadingMore}
              sx={{
                textTransform: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "rgba(235,235,235,0.85)",
                gap: 1,
                px: 1.75,
                py: 0.75,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                '&:hover': {
                  background: "rgba(255,255,255,0.1)",
                  borderColor: "rgba(255,255,255,0.18)",
                },
                '&:disabled': {
                  opacity: 0.6,
                },
              }}
            >
              {loadingMore ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={14} sx={{ color: "rgba(235,235,235,0.85)" }} />
                  Loading…
                </Box>
              ) : (
                "See 10 more"
              )}
            </Button>
          )}
        </Stack>
      )}

      <SiteUpdateDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        error={dialogError}
        loading={dialogLoading}
        title={title}
        description={description}
        dateOption={dateOption}
        dateValue={dateValue}
        onChangeTitle={setTitle}
        onChangeDescription={setDescription}
        onChangeDateOption={setDateOption}
        onChangeDateValue={setDateValue}
        onSubmit={handleSubmit}
        isEditing={Boolean(editingUpdate)}
      />
    </Box>
  );
}

function SiteUpdateDialog({
  open,
  onClose,
  error,
  loading,
  title,
  description,
  dateOption,
  dateValue,
  onChangeTitle,
  onChangeDescription,
  onChangeDateOption,
  onChangeDateValue,
  onSubmit,
  isEditing,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, rgba(18,18,18,0.95), rgba(22,22,22,0.92))",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 3,
          boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
          backdropFilter: "blur(20px)",
        },
      }}
    >
      <DialogTitle
        sx={{
          color: "rgba(255,255,255,0.92)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.78rem",
          pb: 0,
        }}
      >
        {isEditing ? "Edit site update" : "Add site update"}
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          pt: 2,
        }}
      >
        {error ? <Alert severity="error">{error}</Alert> : null}

        <TextField
          label="Update title"
          fullWidth
          value={title}
          onChange={(event) => onChangeTitle(event.target.value)}
          variant="outlined"
          autoFocus
          sx={dialogFieldStyles}
        />

        <TextField
          label="Summary"
          placeholder="Share what changed and why it matters."
          fullWidth
          multiline
          minRows={4}
          value={description}
          onChange={(event) => onChangeDescription(event.target.value)}
          sx={dialogFieldStyles}
        />

        <Box>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", mb: 1, fontWeight: 600, fontSize: "0.8rem" }}>Effective date</Typography>
          <ToggleButtonGroup
            color="primary"
            exclusive
            value={dateOption}
            onChange={(_event, value) => value && onChangeDateOption(value)}
            size="small"
            sx={{
              mb: 2,
              '& .MuiToggleButton-root': {
                textTransform: "none",
                borderRadius: 999,
                px: 2,
                borderColor: "rgba(255,255,255,0.1) !important",
                color: "rgba(255,255,255,0.7)",
                '&.Mui-selected': {
                  backgroundColor: "rgba(147,51,234,0.25)",
                  color: "rgba(255,255,255,0.95)",
                },
              },
            }}
          >
            <ToggleButton value="today">Today</ToggleButton>
            <ToggleButton value="yesterday">Yesterday</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>
          <DateTimePicker
            label="Publish date & time"
            value={dateValue}
            onChange={(newValue) => newValue && onChangeDateValue(newValue)}
            ampm={false}
            slotProps={{
              textField: {
                fullWidth: true,
                sx: dialogFieldStyles,
              },
              actionBar: {
                actions: ['clear', 'cancel', 'accept'],
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            px: 2.6,
            background: "linear-gradient(135deg, rgba(147,51,234,0.45), rgba(79,70,229,0.5))",
            boxShadow: "0 16px 30px rgba(79,70,229,0.24)",
            '&:hover': {
              background: "linear-gradient(135deg, rgba(147,51,234,0.6), rgba(79,70,229,0.65))",
            }
          }}
        >
          {isEditing ? "Save changes" : "Add update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
