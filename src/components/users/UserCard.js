"use client";

import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Divider,
  TextField,
  MenuItem,
  Button,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { useState, useRef } from "react";
import { AddNewRolePopover } from "./AddNewRolePopover";

export function UserCard({ user, roles, setRoles, setActiveUsers }) {
  const [role, setRole] = useState(user.publicMetadata.role);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [showRolePopover, setShowRolePopover] = useState(false);

  const selectRef = useRef(null);

  const handleRoleChange = e => {
    const selectedValue = e.target.value;

    if (selectedValue === "__add_new__") {
      setShowRolePopover(true);
    } else {
      setRole(selectedValue);
    }
  };

  async function handleUpdateMetadata(e) {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await fetch("/api/users/update-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          newMetadata: { role },
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Something went wrong");
      }

      setActiveUsers(prev =>
        prev.map(prevUser => (prevUser.id === user.id ? { ...user, publicMetadata: { ...user.publicMetadata, role } } : prevUser))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRemoveUser() {
    const confirmed = window.confirm("Are you sure you want to remove this user?");
    if (!confirmed) return;

    setIsRemoving(true);

    try {
      const res = await fetch("/api/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkUserId: user.id }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to remove user.");
      }

      setActiveUsers(prev => prev.filter(prevUser => prevUser.id !== user.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Card sx={{ bgcolor: "#1a1a1a", color: "#fff", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Avatar src={user.imageUrl} alt={user.fullname} sx={{ width: 48, height: 48 }} />
          <Stack>
            <Typography variant="h6">{user.fullname || <i>[No Name]</i>}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email || <i>[No Email]</i>}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} my={2}>
          <Chip label={`Role: ${user.publicMetadata.role ?? "—"}`} size="small" color="info" variant="outlined" />
        </Stack>

        <Divider sx={{ mt: 2, mb: 3, borderColor: "#333" }} />

        <form onSubmit={handleUpdateMetadata}>
          <Stack spacing={1} direction="column">
            <TextField
              select
              name="role"
              value={role}
              onChange={handleRoleChange}
              disabled={isUpdating || isRemoving}
              label="Role"
              size="small"
              inputRef={selectRef}
              variant="outlined"
              sx={{ bgcolor: "#2a2a2a" }}
            >
              {roles.map(r => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
              <MenuItem value="__add_new__" sx={{ fontStyle: "italic" }}>
                + Add new role
              </MenuItem>
            </TextField>

            <AddNewRolePopover
              open={showRolePopover}
              onClose={() => setShowRolePopover(false)}
              onAdd={newRole => {
                setRoles(prev => [newRole, ...prev]);
                setRole(newRole);
              }}
              existingRoles={roles}
            />

            <br />
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={isUpdating || role === user.publicMetadata.role}
                sx={{ flex: 7, p: 1 }}
              >
                {isUpdating ? <CircularProgress size={22} /> : "Save"}
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                disabled={isRemoving}
                sx={{
                  flex: 3,
                  p: 1,
                  "&.Mui-disabled": {
                    borderColor: "error.main",
                    color: "error.main",
                    opacity: 0.5,
                  },
                }}
                onClick={handleRemoveUser}
              >
                {isRemoving ? <CircularProgress color="error" size={22} /> : "Remove"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
