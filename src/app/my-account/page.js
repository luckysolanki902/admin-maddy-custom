"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";

export default function Page() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Typography variant="h6" align="center">
          Loading...
        </Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Typography variant="h6" align="center">
          User not authenticated.
        </Typography>
      </Container>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,rgb(47, 47, 47) 0%,rgb(116, 117, 118) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: "100%",
          borderRadius: "16px",
          boxShadow: 3,
          p: 2,
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            color="primary"
            sx={{ fontWeight: 600 }}
          >
            Welcome, {user.fullName}
          </Typography>
          <Typography variant="body1" color="textSecondary" align="center">
            Signed in as: {user.emailAddresses[0].emailAddress}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" color="textSecondary">
              Role:
            </Typography>
            <Chip
              label={user.publicMetadata.role || "User"}
              color="primary"
              variant="outlined"
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleLogout}
            sx={{ mt: 2, px: 4, py: 1.5 }}
          >
            Logout
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
