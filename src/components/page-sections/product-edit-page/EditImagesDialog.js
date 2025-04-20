"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  IconButton,
  Button,
  Box,
  Card,
  CardMedia,
  CardActions,
  CircularProgress,
} from "@mui/material";
import { Delete, Edit, Add } from "@mui/icons-material";
import EditIcon from "@mui/icons-material/Edit";
import { joinURLs } from "@/lib/utils/generalFunctions";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function EditImagesDialog({ 
  available, 
  carouselImages, 
  setCarouselImages, 
  cloudfrontBaseUrl,
  type = "main", // Default to main if not specified
  handleImageUpdate // Pass this function directly instead of onEditImage
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);
  
  const timeoutRef = useRef(null);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Handle image edit action (replace, add, delete) inside the dialog
  const handleImageEdit = async (action, idx, reorderedImages) => {
    if (action === "add" || action === "replace") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = type === "main" ? "image/jpeg,image/png" : "image/png";
      
      input.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        const validTypes = type === "main" ? ["image/jpeg", "image/png"] : ["image/png"];
        if (!validTypes.includes(file.type)) {
          // You might want to add some error handling here
          alert(`Invalid file type. Please upload a ${type === "main" ? "JPG or PNG" : "PNG"} file.`);
          return;
        }
        
        // Validate file size
        const maxSizeInBytes = type === "main" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSizeInBytes) {
          alert(`File size exceeds the limit of ${type === "main" ? "15MB" : "10MB"}. Please choose a smaller file.`);
          return;
        }
        
        // Handle the update
        setLoading(true);
        await handleImageUpdate(type, action, file, idx, reorderedImages);
        setLoading(false);
      };
      
      input.click();
    } else {
      // For delete and reorder actions
      setLoading(true);
      await handleImageUpdate(type, action, null, idx, reorderedImages);
      setLoading(false);
    }
  };

  const handleDragEnd = result => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const reorderedImages = [...carouselImages];
    const [moved] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, moved);

    setCarouselImages(reorderedImages);

    // debounce mechanism
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      handleImageEdit("reorder", null, reorderedImages);
    }, 2000);
  };

  return (
    <div>
      {/* Edit Images Dialog trigger*/}
      <IconButton
        color="primary"
        aria-label="edit image"
        onClick={handleClickOpen}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          backgroundColor: available ? "rgba(200,200,200,0.5)" : "rgba(255,255,255,0.7)",
          "&:hover": {
            backgroundColor: available ? "rgba(200,200,200,0.7)" : "rgba(255,255,255,0.9)",
          },
        }}
      >
        <EditIcon />
      </IconButton>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            Edit {type === "option" ? "Option" : "Product"} Images
            {loading && <CircularProgress size={20} color="primary" />}
          </Box>
        </DialogTitle>
        <DialogContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="images" direction="horizontal">
              {provided => (
                <Box display="flex" flexWrap="wrap" gap={2} ref={provided.innerRef} {...provided.droppableProps}>
                  {carouselImages.map((img, idx) => (
                    <Draggable key={img} draggableId={img} index={idx}>
                      {provided => (
                        <Box ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} width={160}>
                          <Card>
                            <CardMedia
                              component="img"
                              draggable={true}
                              height="120"
                              onDropCapture={e => e.preventDefault()}
                              image={joinURLs(cloudfrontBaseUrl, img)}
                            />
                            <CardActions
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Box>
                                <IconButton
                                  component="label"
                                  size="small"
                                  disabled={loading}
                                  onClick={() => handleImageEdit("replace", idx)}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setDeleteTargetIndex(idx);
                                    setDeleteDialogOpen(true);
                                  }}
                                  disabled={loading || carouselImages.length <= 1}
                                >
                                  {carouselImages.length > 1 && <Delete fontSize="small" />}
                                </IconButton>
                              </Box>

                              <Box fontSize={12} color="text.secondary" pr={1}>
                                #{idx + 1}
                              </Box>
                            </CardActions>
                          </Card>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Add Image Block */}
                  <Box
                    width={160}
                    height={160}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    border="2px dashed #ccc"
                    borderRadius={2}
                    component="label"
                    sx={{ cursor: "pointer" }}
                  >
                    <IconButton onClick={() => handleImageEdit("add", carouselImages.length)} disabled={loading}>
                      <Add fontSize="large" />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="error">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Image confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to delete image #{deleteTargetIndex + 1}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleteTargetIndex !== null) {
                handleImageEdit("delete", deleteTargetIndex);
              }
              setDeleteDialogOpen(false);
              setDeleteTargetIndex(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}