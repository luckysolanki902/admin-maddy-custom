"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Grid, Stack, Divider, Card, CardContent, Skeleton } from "@mui/material";

import { SearchUsers } from "./SearchUsers";
import { AddMemberDialog } from "@/components/users/AddUserDialog";
import { UserCard } from "@/components/users/UserCard";
import { InvitedUserCard } from "@/components/users/InvitedUserCard";

export default function AdminDashboard() {
  const [activeUsers, setActiveUsers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const [users, invites] = await Promise.all([
          fetch(`/api/users/list-users?search=${searchQuery}`).then(res => (res.ok ? res.json() : [])),
          fetch(`/api/users/list-invites?search=${searchQuery}`).then(res => (res.ok ? res.json() : [])),
        ]);

        setActiveUsers(users);
        setPendingInvites(invites);
        setRoles(() => {
          const roleSet = new Set();
          users.forEach(user => {
            const role = user.publicMetadata?.role;
            if (role) roleSet.add(role);
          });
          invites.forEach(invite => {
            const role = invite.publicMetadata?.role;
            if (role) roleSet.add(role);
          });

          return Array.from(roleSet);
        });
      } catch (err) {
        console.error(err);
        alert("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchQuery]);

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 5, minHeight: "100vh" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Team Access Control
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage user roles
          </Typography>
        </Box>
        <AddMemberDialog roles={roles} setRoles={setRoles} setPendingInvites={setPendingInvites} />
      </Stack>

      <Box mb={3}>
        <SearchUsers onChange={val => setSearchQuery(val)} />
      </Box>

      {/* Active Users */}
      <Typography variant="h6" color="text.primary" mb={2}>
        Active Members
      </Typography>
      <Grid container spacing={3} mb={5}>
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card sx={{ bgcolor: "#1a1a1a", color: "#fff", height: "100%" }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Skeleton variant="text" width="40%" height={40} />
                      <Skeleton variant="text" width="60%" height={30} />
                      <Skeleton variant="text" width="20%" height={30} />
                      <Skeleton variant="rounded" height={32} width="100%" />
                      <Skeleton variant="rounded" height={36} width="100%" />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          : activeUsers.map(user => (
              <Grid item xs={12} sm={6} md={4} key={user.id}>
                <UserCard user={user} setActiveUsers={setActiveUsers} roles={roles} setRoles={setRoles} />
              </Grid>
            ))}
      </Grid>

      {/* Invited Users */}
      {pendingInvites.length > 0 && (
        <>
          <Divider sx={{ borderColor: "#333", mb: 3 }} />
          <Typography variant="h6" color="text.primary" mb={2}>
            Invited Members
          </Typography>
          <Grid container spacing={3}>
            {pendingInvites.map(invite => (
              <Grid item xs={12} sm={6} md={4} key={invite.id}>
                <InvitedUserCard invite={invite} setPendingInvites={setPendingInvites} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
