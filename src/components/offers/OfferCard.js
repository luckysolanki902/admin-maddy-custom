import React, { useMemo, useState } from "react";
import { Card, CardContent, Typography, Box, Divider, Tooltip, Switch, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import OffersFormDialog from "./OfferFormDialog";

// Array of darker gradient backgrounds that look cool in any combination.
const darkerGradients = [
  "linear-gradient(135deg, #F02FC2, #6094EA)",
  "linear-gradient(135deg, #F5D020, #F53803)",
  "linear-gradient(135deg, #00C9FF, #92FE9D)",
  "linear-gradient(135deg, #FBAB7E, #F7CE68)",
  "linear-gradient(135deg, #EB3349, #F45C43)",
  "linear-gradient(135deg, #FFC107, #FF9900)",
  "linear-gradient(135deg, #45B3FA, #4183D7)",
  "linear-gradient(135deg, #6A6BD1, #7356B8)",
];

export default function OfferCard({ offerData, setOffers, setErrorAlert, setSuccessAlert, isInDialog }) {
  const [submitting, setSubmitting] = useState(false);

  if (offerData._id === "6831c3ccd69076eded0bd4b2") console.log(offerData);

  const [openEditDialog, setOpenEditDialog] = useState(false);

  // assign a bg gradient on the basis of offerData.name
  const background = useMemo(() => {
    let hash = 2166136261;
    for (let i = 0; i < offerData.name.length; i++) {
      hash ^= offerData.name.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const gradIdx = Math.floor(((Math.abs(hash) % 1000000) / 1000000) * darkerGradients.length);
    return darkerGradients[gradIdx];
  }, [offerData.name]);

  async function handleToggleActive(offerId) {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/manage/offers/${offerId}/toggle-active`, { method: "PATCH" });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message ?? "Failed to change active state of offer");
      }

      const data = await res.json();

      setOffers(prevOffers =>
        prevOffers.map(prevOffer => ({ ...prevOffer, isActive: offerId === prevOffer._id ? data.isActive : prevOffer.isActive }))
      );

      setSuccessAlert(true);
    } catch (error) {
      setErrorAlert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // <Tooltip title={offerData.description} disableInteractive>
    <Card
      sx={{
        width: 200,
        height: 250,
        background,
        borderRadius: 2,
        boxShadow: 3,
        position: "relative",
        opacity: isInDialog || offerData.isActive ? 1 : 0.4,
        "&:hover .card-controls": { opacity: 1 },
      }}
    >
      {/* Background text */}
      <Box
        sx={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%) rotate(-15deg)",
          fontSize: "50px",
          fontWeight: "bold",
          color: "white",
          opacity: 0.16,
        }}
      >
        {offerData.actions[0].type === "discount_percent"
          ? `${offerData.actions[0].discountValue || "XX"}% OFF`
          : offerData.actions[0].type === "discount_fixed"
          ? `₹${offerData.actions[0].discountValue || "XX"} OFF`
          : `₹${offerData.actions[0].bundlePrice || "XXX"}`}
      </Box>

      {/* toggle active and edit button*/}
      {!isInDialog && (
        <Box
          className="card-controls"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexGrow: 1,
            gap: 1,
            opacity: 0,
            transition: "opacity 0.2s",
            zIndex: 1,
          }}
        >
          <Tooltip title={`Click to ${offerData.isActive ? "deactivete" : "activate"} this offer`}>
            <Switch
              disabled={submitting}
              size="small"
              checked={offerData.isActive}
              onClick={() => handleToggleActive(offerData._id)}
            />
          </Tooltip>
          <IconButton onClick={() => setOpenEditDialog(true)} disabled={submitting} size="small" color="primary">
            <EditIcon fontSize="small" />
            {openEditDialog && (
              <OffersFormDialog
                oldData={offerData}
                open={openEditDialog}
                onClose={() => setTimeout(() => setOpenEditDialog(false))}
                // onClose={() => setOpenEditDialog(false)}   //doesnt work for some reason
                setOffers={setOffers}
                setErrorAlert={setErrorAlert}
                setSuccessAlert={setSuccessAlert}
              />
            )}
          </IconButton>
        </Box>
      )}

      <CardContent
        sx={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", color: "white" }}
      >
        {/* Discount Name */}
        <Box sx={{ textAlign: "center", pt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", fontSize: "1.2rem", color: "white" }}>
            {offerData.name || <i>Offer Name</i>}
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
          {/* Left Circle */}
          <Box
            sx={{
              position: "absolute",
              left: -25,
              width: 20,
              height: 20,
              backgroundColor: "white",
              borderRadius: "50%",
              boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.3)",
              opacity: 0.6,
            }}
          />

          {/* Divider */}
          <Divider
            sx={{
              marginY: "0%",
              borderStyle: "dashed",
              borderColor: "white",
              width: "106%",
              transform: "translateX(-2.8%)",
            }}
          />

          {/* Right Circle */}
          <Box
            sx={{
              position: "absolute",
              right: -25,
              width: 20,
              height: 20,
              backgroundColor: "white",
              borderRadius: "50%",
              boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.3)",
              opacity: 0.6,
            }}
          />
        </Box>

        {/* Discount Value */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "white" }}>
            {offerData.actions[0].type === "discount_percent"
              ? `${offerData.actions[0].discountValue || "XX"}% `
              : offerData.actions[0].type === "discount_fixed"
              ? `₹${offerData.actions[0].discountValue || "XX"} `
              : `₹${offerData.actions[0].bundlePrice || "XXX"} `}
            {offerData.actions[0].type !== "bundle" && <span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>OFF</span>}
          </Typography>
        </Box>

        {/* Validity */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "white" }}>
            {/* display in beautiful format like 10 January 2026 */}
            {`Valid till ${
              offerData.validUntil
                ? new Date(offerData.validUntil).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "XXXX"
            }`}
          </Typography>
        </Box>

        {/* Apply Button */}
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.8rem",
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            {offerData.conditionMessage || <i>Condition will be displayed here</i>}
          </Typography>

          {/* <Button variant="contained" sx={{ backgroundColor: "white", color: "#2196F3", textTransform: "none" }}>
            APPLY
          </Button> */}
        </Box>
      </CardContent>
    </Card>
    // </Tooltip>
  );
}
