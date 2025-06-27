"use client";

import { usePathname, useRouter } from "next/navigation";
import { TextField, Button, Stack, Box } from "@mui/material";
import { useEffect, useState } from "react";

export const SearchUsers = ({ onChange }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(search);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [onChange, search]);

  return (
    <TextField
      id="search"
      name="search"
      value={search}
      onChange={e => setSearch(e.target.value)}
      variant="outlined"
      placeholder="Search..."
      fullWidth
      size="small"
      sx={{
        input: { color: "#e0f7fa" },
        bgcolor: "#1e1e1e",
        borderRadius: 1,
        "& .MuiOutlinedInput-root": {
          "& fieldset": {
            borderColor: "#444",
          },
          "&:hover fieldset": {
            borderColor: "#888",
          },
          "&.Mui-focused fieldset": {
            borderColor: "#85e0e0",
          },
        },
      }}
    />
  );
};
