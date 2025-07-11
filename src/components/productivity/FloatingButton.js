"use client"; // Add this if using Next.js app directory

import React from "react";
import Link from "next/link";
import { Fab, Box, Typography, useMediaQuery, Slide } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useUser } from "@clerk/nextjs";
import { departmentAdmins } from "@/lib/constants/user";

const deptAdminSet = new Set(Object.values(departmentAdmins).map(admin => admin.email));

const FloatingButton = () => {
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up("md"));
  const [hover, setHover] = React.useState(false);

  const { user } = useUser()

  if (!deptAdminSet.has(user?.primaryEmailAddress?.emailAddress)) {
    return null;
  }

  return (
    <Link href="/admin/productivity/form" style={{ textDecoration: "none" }}>
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          zIndex: 1000,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {isLargeScreen && (
          <Slide direction="left" in={hover} mountOnEnter unmountOnExit>
            <Typography
              variant="button"
              sx={{
                mr: 1.5,
                bgcolor: "background.default",
                color: "white",
                px: 2,
                py: 1,
                borderRadius: 1,
                whiteSpace: "nowrap",
              }}
            >
              Daily Productivity
            </Typography>
          </Slide>
        )}
        <Fab
          size="medium"
          sx={{
            bgcolor: "background.default",
            color: "white",
            ":hover": { bgcolor: "background.default" },
          }}
        >
          <AssignmentIcon />
        </Fab>
      </Box>
    </Link>
  );
};

export default FloatingButton;
