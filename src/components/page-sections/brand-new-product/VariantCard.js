"use client";
import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import Link from "next/link";

function VariantCard({ variant, onEdit }) {
  const { _id,name, variantCode, variantType, description } = variant;

  return (
    <Card
      variant="outlined"
      sx={{
        width: 300,
        margin: "1rem",
        height: 250,
        position: "relative",
        overflowY: "auto",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          {name}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Code: {variantCode}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Type: {variantType}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
        <Link href={`/admin/manage/brand-new/product/${_id}`} style={{ color:'white', textDecoration: 'underline' }} target="_blank">Manage Products</Link>
      </CardContent>
      <Button
        sx={{ position: "absolute", top: 5, right: 5 }}
        size="small"
        variant="contained"
        onClick={() => onEdit(variant)}
      >
        Edit
      </Button>
    </Card>
  );
}

export default VariantCard;
