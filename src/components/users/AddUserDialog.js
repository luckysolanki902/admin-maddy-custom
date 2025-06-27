"use client";
import { useState } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Stack,
  CircularProgress,
} from "@mui/material";
import { AddNewRolePopover } from "./AddNewRolePopover";

export function AddMemberDialog({ roles, setPendingInvites, setRoles }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "" });

  const [loading, setLoading] = useState(false);
  const [showRolePopover, setShowRolePopover] = useState(false);

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Invite failed:", result.error);
        alert(result.error || "Something went wrong");
        return;
      }

      setPendingInvites(prev => [...prev, invite]);
      setForm({ email: "", role: "" });
      setOpen(false);
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outlined" sx={{ mt: 3 }} onClick={() => setOpen(true)}>
        Invite New Member
      </Button>

      <AddNewRolePopover
        open={showRolePopover}
        onClose={() => setShowRolePopover(false)}
        onAdd={newRole => {
          setRoles(prev => [newRole, ...prev]);
          setForm(prev => ({ ...prev, role: newRole }));
        }}
        existingRoles={roles}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="Email" name="email" value={form.email} onChange={handleChange} />
            <TextField
              select
              fullWidth
              label="Role"
              name="role"
              value={form.role}
              onChange={e => {
                if (e.target.value === "__add_new__") {
                  setShowRolePopover(true);
                } else {
                  handleChange(e);
                }
              }}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !form.email || !form.role || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)}
          >
            {loading ? <CircularProgress size={20} /> : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
