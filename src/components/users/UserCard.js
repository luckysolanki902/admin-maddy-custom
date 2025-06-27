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

export function UserCard({ user, roles, setRoles }) {
  const [currRole, setCurrRole] = useState(user.publicMetadata.role);
  const [role, setRole] = useState(currRole);
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

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

      setCurrRole(role);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
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
          <Chip label={`Role: ${currRole ?? "—"}`} size="small" color="info" variant="outlined" />
        </Stack>

        <Divider sx={{ mt: 2, mb: 3, borderColor: "#333" }} />

        <form onSubmit={handleSubmit}>
          <Stack spacing={1} direction="column">
            <TextField
              select
              name="role"
              value={role}
              onChange={handleRoleChange}
              disabled={loading}
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
            <Button type="submit" variant="contained" size="small" disabled={loading || currRole === role} sx={{ mt: 1, p: 1 }}>
              {loading ? <CircularProgress size={22} /> : "Save Changes"}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
