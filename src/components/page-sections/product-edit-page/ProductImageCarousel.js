// /src/components/page-sections/product-edit-page/ProductImageCarousel.js

import React from "react";
import { Box, IconButton, Paper, Typography, Divider } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import Image from "next/image";
import { joinURLs } from "@/lib/utils/generalFunctions";
import EditImagesDialog from "./EditImagesDialog";

const ProductImageCarousel = ({
  carouselImages,
  setCarouselImages,
  currentImageIndex,
  onPrevImage,
  onNextImage,
  onEditImage,
  cloudfrontBaseUrl,
  available,
}) => {
  const imageUrl = carouselImages.length > 0 ? joinURLs(cloudfrontBaseUrl, carouselImages[currentImageIndex]) : "";

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 3, 
        border: '1px solid #333',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <PhotoLibraryIcon sx={{ color: '#bbb' }} />
        <Typography variant="h6" color="#f0f0f0">
          {carouselImages.length > 1 ? "Product Images" : "Product Image"}
        </Typography>
        {carouselImages.length > 1 && (
          <Typography variant="caption" color="#ddd" sx={{ ml: 'auto' }}>
            {currentImageIndex + 1} of {carouselImages.length}
          </Typography>
        )}
      </Box>
      
      <Divider sx={{ mb: 3, backgroundColor: '#333' }} />

      <Box position="relative" display="flex" alignItems="center" justifyContent="center">
        {/* Back Arrow */}
        <IconButton
          onClick={onPrevImage}
          size="small"
          sx={{
            position: "absolute",
            left: -20,
            zIndex: 1,
            backgroundColor: "rgba(42,42,42,0.9)",
            border: '1px solid #333',
            color: 'white',
            "&:hover": {
              backgroundColor: "rgba(42,42,42,1)",
            },
            display: carouselImages.length <= 1 ? "none" : "block",
          }}
          disabled={carouselImages.length <= 1}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Current Image */}
        {carouselImages.length > 0 ? (
          <Box display={"flex"} flexDirection={"column"} width="100%">
            <Image
              width={1200}
              height={1200}
              src={imageUrl}
              alt={`Product Image ${currentImageIndex + 1}`}
              style={{ width: "100%", height: "auto", borderRadius: "12px" }}
              key={imageUrl}
            />
          </Box>
        ) : (
          <Box 
            sx={{ 
              width: '100%', 
              height: 200, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#0f0f0f',
              borderRadius: '12px',
              border: '2px dashed #444'
            }}
          >
            <Typography color="#bbb">No images uploaded</Typography>
          </Box>
        )}

        {/* Forward Arrow */}
        <IconButton
          onClick={onNextImage}
          size="small"
          sx={{
            position: "absolute",
            right: -20,
            zIndex: 1,
            backgroundColor: "rgba(42,42,42,0.9)",
            border: '1px solid #333',
            color: 'white',
            "&:hover": {
              backgroundColor: "rgba(42,42,42,1)",
            },
            display: carouselImages.length <= 1 ? "none" : "block",
          }}
          disabled={carouselImages.length <= 1}
        >
          <ArrowForwardIcon />
        </IconButton>

        {/* Edit Image Button */}
        <span>
          <EditImagesDialog
            available={available}
            carouselImages={carouselImages}
            setCarouselImages={setCarouselImages}
            onEditImage={onEditImage}
            cloudfrontBaseUrl={cloudfrontBaseUrl}
          />
        </span>
      </Box>
    </Paper>
  );
};

export default ProductImageCarousel;
