"use client";

import { Card, CardContent, Typography, Chip, Stack, Button } from "@mui/material";
import { useState } from "react";

export function InvitedUserCard({ invite, setPendingInvites }) {
  const [loading, setLoading] = useState(false);

  async function revokeInvite() {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    setLoading(true);

    try {
      const res = await fetch("/api/users/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invite.id }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to revoke invitation");
      }

      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (err) {
      console.error(err);
      alert(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card sx={{ bgcolor: "#1a1a1a", color: "#fff", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Invited User
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {invite.email}
        </Typography>

        <Stack direction="row" spacing={2} mt={2} alignItems="center">
          <Chip label={`Role: ${invite.publicMetadata?.role ?? "—"}`} size="small" color="info" variant="outlined" />
          <Chip label="Invitation Pending" size="small" color="warning" />
        </Stack>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={revokeInvite}
          disabled={loading}
          fullWidth
          sx={{ mt: 3, py: 1 }}
        >
          {loading ? "Revoking..." : "Revoke"}
        </Button>
      </CardContent>
    </Card>
  );
}
