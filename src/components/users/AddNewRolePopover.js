// components/users/AddNewRolePopover.js
"use client";
import { Popover, Stack, Typography, TextField, Button } from "@mui/material";
import { useState } from "react";

export function AddNewRolePopover({ open, onClose, onAdd, existingRoles }) {
  const [newRoleInput, setNewRoleInput] = useState("");

  const handleAdd = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed || existingRoles.includes(trimmed)) return;

    onAdd(trimmed);
    setNewRoleInput("");
    onClose();
  };

  const handleCancel = () => {
    setNewRoleInput("");
    onClose();
  };

  return (
    <Popover
      open={open}
      onClose={handleCancel}
      anchorReference="anchorPosition"
      anchorPosition={{ top: 100, left: window.innerWidth / 2 }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      PaperProps={{
        sx: {
          width: 400,
          p: 3,
          backgroundColor: "#1e1e1e",
        },
      }}
    >
      <Stack spacing={2}>
        <Typography variant="subtitle1" color="white">
          Add New Role
        </Typography>
        <TextField
          label="New role"
          size="small"
          value={newRoleInput}
          onChange={e => setNewRoleInput(e.target.value)}
          autoFocus
          fullWidth
          variant="outlined"
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={handleCancel} size="small" color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleAdd}
            disabled={!newRoleInput.trim() || existingRoles.includes(newRoleInput.trim())}
          >
            Add
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}
