"use client";
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
import { useRouter } from "next/navigation";

function CategoryCard({ category, onEdit }) {
  const router = useRouter();
  const { _id, name, specificCategoryCode, description, subCategory, category: cat } = category;

  const handleCardClick = () => {
    // Navigate to the variant page for this category
    router.push(`/admin/manage/brand-new/spec-cat-var/${_id}`); 
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent card click from firing
    onEdit(category);
  };

  return (
    <Card
      variant="outlined"
      onClick={handleCardClick}
      sx={{
        width: 300,
        margin: "1rem",
        height: 300,
        position: "relative",
        overflowY: "auto",
        cursor: "pointer"
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          {name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Code: {specificCategoryCode}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Sub Category: {subCategory}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Category: {cat}
        </Typography>
      </CardContent>
      <Button
        sx={{ position: "absolute", top: 5, right: 5 }}
        size="small"
        variant="contained"
        onClick={handleEditClick}
      >
        Edit
      </Button>
    </Card>
  );
}

export default CategoryCard;
