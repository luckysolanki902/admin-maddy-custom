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

export default function DialogBox({ available, carouselImages, setCarouselImages, onEditImage, cloudfrontBaseUrl }) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);

  const [loading, setLoading] = useState(false);

  const timeoutRef = useRef(null);

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
      onEditImage("main", "reorder", setLoading, null, reorderedImages);
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
        // disabled={available}
      >
        <EditIcon />
      </IconButton>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            Edit Images
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
                                  onClick={() => onEditImage("main", "replace", setLoading, idx)}
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
                                  disabled={loading}
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
                    <IconButton onClick={() => onEditImage("main", "add", setLoading, carouselImages.length)} disabled={loading}>
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
                onEditImage("main", "delete", setLoading, deleteTargetIndex);
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
