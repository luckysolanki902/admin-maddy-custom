"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography,
  Grid,
  Paper,
  Chip,
  Collapse,
  CircularProgress,
  Stack,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export default function AccessControlPage() {
  const [paths, setPaths] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newPath, setNewPath] = useState({ pathname: "", rolesAllowed: [] });
  const [updateForm, setUpdateForm] = useState({ pathname: "", rolesAllowed: [] });
  const [openForm, setOpenForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch paths and roles
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [paths, roles] = await Promise.all([
          fetch("/api/authentication/paths").then(res => res.json()),
          fetch("/api/users/roles").then(res => res.json()),
        ]);
        setPaths(paths);
        setRoles(roles);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddPath = async e => {
    e.preventDefault();
    try {
      setIsAdding(true);

      const res = await fetch("/api/authentication/paths/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPath),
      });

      if (!res.ok) {
        throw new Error("Operation failed");
      }

      const data = await res.json();
      setPaths(prev => [...prev, data]);
      setNewPath({ pathname: "", rolesAllowed: [] });
      setOpenForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePath = async pathname => {
    const confirmed = window.confirm(`Are you sure you want to delete "${pathname}"?`);
    if (!confirmed) return;

    try {
      setIsUpdating(true);
      const res = await fetch("/api/authentication/paths/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });

      if (!res.ok) {
        throw new Error("Operation failed");
      }

      setPaths(prev => prev.filter(p => p.pathname !== pathname));
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAccess = async () => {
    try {
      setIsUpdating(true);
      const res = await fetch("/api/authentication/paths/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
      });

      if (!res.ok) {
        throw new Error("Operation failed");
      }

      setPaths(prev => prev.map(p => (p.pathname === updateForm.pathname ? { ...p, rolesAllowed: updateForm.rolesAllowed } : p)));
      setUpdateForm({ pathname: "", rolesAllowed: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelection = (form, setForm, key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(item => item !== value) : [...prev[key], value],
    }));
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: "auto" }}>
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={2}
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={600} color="primary">
          Manage Access Control
        </Typography>
        <Button variant="outlined" startIcon={openForm ? <ExpandLess /> : <ExpandMore />} onClick={() => setOpenForm(!openForm)}>
          {openForm ? "Hide Form" : "Add New Path"}
        </Button>
      </Box>

      {/* Add Path Form */}
      <Collapse in={openForm}>
        <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: "#1a1a1a" }}>
          <form onSubmit={handleAddPath}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} minWidth="100%">
                <TextField
                  fullWidth
                  required
                  label="Pathname"
                  variant="outlined"
                  value={newPath.pathname}
                  onChange={e => setNewPath(prev => ({ ...prev, pathname: e.target.value }))}
                  disabled={isAdding}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Allowed Roles:
                </Typography>
                <Grid container spacing={1}>
                  {roles.map(role => (
                    <Grid item key={role}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={newPath.rolesAllowed.includes(role)}
                            onChange={() => toggleSelection(newPath, setNewPath, "rolesAllowed", role)}
                          />
                        }
                        label={role}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Button type="submit" variant="contained" disabled={isAdding}>
                  Add Path
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Collapse>

      {/* Paths Display */}
      <Typography variant="h5" gutterBottom>
        Existing Paths
      </Typography>

      {isLoading ? (
        <Box textAlign="center" py={5}>
          <CircularProgress color="primary" />
        </Box>
      ) : paths.length === 0 ? (
        <Typography color="text.secondary" mt={2}>
          No paths available.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {paths.map(path => (
            <Grid item xs={12} md={6} key={path.pathname}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: "#1e1e1e" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {path.pathname}
                </Typography>
                <Box mt={1} mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Roles:
                  </Typography>
                  {path.rolesAllowed?.length ? (
                    path.rolesAllowed.map(role => <Chip label={role} key={role} sx={{ mr: 1, mb: 1 }} />)
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      None
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setUpdateForm({
                        pathname: path.pathname,
                        rolesAllowed: path.rolesAllowed,
                      })
                    }
                    disabled={isUpdating}
                  >
                    Update
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => handleDeletePath(path.pathname)}
                    disabled={isUpdating}
                  >
                    Delete
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Update Modal */}
      <Dialog
        open={!!updateForm.pathname}
        onClose={() => setUpdateForm({ pathname: "", rolesAllowed: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Access for {updateForm.pathname}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" mt={2}>
            Allowed Roles:
          </Typography>
          <Grid container spacing={1} mt={1}>
            {roles.map(role => (
              <Grid item key={role}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updateForm.rolesAllowed.includes(role)}
                      onChange={() => toggleSelection(updateForm, setUpdateForm, "rolesAllowed", role)}
                    />
                  }
                  label={role}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateForm({ pathname: "", rolesAllowed: [] })}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateAccess} disabled={isUpdating}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
