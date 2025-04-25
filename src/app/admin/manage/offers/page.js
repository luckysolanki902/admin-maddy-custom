"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Snackbar, Alert, Divider, Drawer, MenuItem, TextField, IconButton } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import AddIcon from "@mui/icons-material/Add";
import OffersFormDialog from "@/components/offers/OfferFormDialog";
import OfferCard from "@/components/offers/OfferCard";
import OfferCardSkeleton from "@/components/offers/OfferCardSkeleton";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const defaultFilterOptions = {
  activeState: "any",
  showAsCardState: "any",
  discountType: "any",
  conditionType: "any",
};

export default function ManageOffers() {
  const [successAlert, setSuccessAlert] = useState(false);

  const [errorAlert, setErrorAlert] = useState("");

  // isLoading state for initial offers fetch
  const [isLoading, setIsLoading] = useState(false);

  const [isError, setIsError] = useState(false);

  const [offers, setOffers] = useState([]);

  const [filteredOffers, setFilteredOffers] = useState([]);

  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const [retryTrigger, setRetryTrigger] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [sortOption, setSortOption] = useState("name");

  const [filterOption, setFilterOption] = useState(defaultFilterOptions);

  function handleSortChange(e) {
    const value = e.target.value;
    setSortOption(value);
  }

  useEffect(() => {
    // Fetching offers
    async function fetchOffers() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/admin/manage/offers");
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message ?? "Could not get offers");
        }

        const data = await res.json();

        setOffers(data);

        setIsError(false);
      } catch (error) {
        setIsError(true);
        setErrorAlert(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOffers();
  }, [retryTrigger]);

  useEffect(() => {
    const handleFilter = () => {
      let filteredData = [...offers];

      if (filterOption.activeState !== "any") {
        filteredData = filteredData.filter(offer => (filterOption.activeState === "active" ? offer.isActive : !offer.isActive));
      }

      if (filterOption.discountType !== "any") {
        filteredData = filteredData.filter(offer => filterOption.discountType === offer?.actions[0]?.type);
      }

      if (filterOption.conditionType !== "any") {
        filteredData = filteredData.filter(offer =>
          filterOption.conditionType === "both"
            ? offer.conditions.length === 2
            : offer.conditions.some(condition => filterOption.conditionType === condition?.type)
        );
      }

      if (sortOption) {
        filteredData = filteredData.sort((a, b) => {
          if (sortOption === "name") {
            return a.name.localeCompare(b.name);
          }
          if (sortOption === "validFrom") {
            return new Date(a.validFrom) - new Date(b.validFrom);
          }
          if (sortOption === "validUntil") {
            return new Date(a.validUntil) - new Date(b.validUntil);
          }
          return 0;
        });
      }

      // Set filtered and sorted offers
      setFilteredOffers(filteredData);
    };

    handleFilter();
  }, [filterOption, offers, sortOption]);

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: "center", fontWeight: "bold" }}>
          Manage Offers
        </Typography>

        <Box sx={{ ml: 2, my: 5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
          <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={() => setOpenCreateDialog(true)}>
            Create Offer
          </Button>

          <OffersFormDialog
            open={openCreateDialog}
            onClose={() => setOpenCreateDialog(false)}
            setOffers={setOffers}
            setErrorAlert={setErrorAlert}
            setSuccessAlert={setSuccessAlert}
            isCreateNewOffer
          />

          <Button variant="outlined" color="primary" startIcon={<FilterListIcon />} onClick={() => setIsDrawerOpen(true)}>
            Sort & Filter
          </Button>
        </Box>

        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2} sx={{ justifyItems: "center" }}>
          {isLoading ? (
            [...Array(5)].map((_, i) => <OfferCardSkeleton key={i} />)
          ) : isError ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height={250}
              width={200}
              border="1px dashed #ccc"
              borderRadius={2}
              p={2}
              sx={{ cursor: "pointer" }}
              onClick={() => setRetryTrigger(prev => !prev)}
            >
              <Typography variant="body1" color="error" fontWeight="bold" gutterBottom>
                Error loading offers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click to retry
              </Typography>
            </Box>
          ) : (
            filteredOffers.map(offer => (
              <OfferCard
                key={offer._id}
                offerData={offer}
                setOffers={setOffers}
                setSuccessAlert={setSuccessAlert}
                setErrorAlert={setErrorAlert}
                isInDialog={false}
              />
            ))
          )}
        </Box>
      </Box>
      <>
        {/* Success Snackbar */}
        <Snackbar
          open={successAlert}
          autoHideDuration={3000}
          onClose={() => setSuccessAlert(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={() => setSuccessAlert(false)} severity="success" sx={{ width: "100%" }}>
            Operation completed successfully!
          </Alert>
        </Snackbar>

        {/* Error Snackbar */}
        <Snackbar
          open={!!errorAlert}
          autoHideDuration={6000}
          onClose={() => setErrorAlert("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={() => setErrorAlert("")} severity="error" sx={{ width: "100%" }}>
            {errorAlert}
          </Alert>
        </Snackbar>

        {/* Sorting and Filtering Drawer */}
        <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
          <Box sx={{ width: 300, padding: "16px" }} role="presentation">
            <Typography variant="h6" gutterBottom>
              Sort & Filter
            </Typography>
            <Divider />
            <Typography variant="subtitle1" mt={2}>
              Sorting Options
            </Typography>
            <Box mt={2}>
              <TextField
                select
                label="Sort By"
                value={sortOption}
                onChange={handleSortChange}
                fullWidth
                size="small"
                sx={{ mt: 1 }}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="validFrom">Valid From</MenuItem>
                <MenuItem value="validUntil">Valid Until</MenuItem>
              </TextField>
            </Box>
            <Divider sx={{ mt: 5 }} />
            <Box display="flex" alignItems="center" mt={2}>
              <Typography variant="subtitle1">Filtering Options</Typography>
              <IconButton
                onClick={() => {
                  setFilterOption(defaultFilterOptions);
                }}
                color="primary"
              >
                <RestartAltIcon />
              </IconButton>
            </Box>
            <Box mt={2}>
              <TextField
                select
                label="Filter by active"
                value={filterOption.activeState}
                onChange={e =>
                  setFilterOption(prev => ({
                    ...prev,
                    activeState: e.target.value,
                  }))
                }
                fullWidth
                size="small"
                sx={{ mt: 1 }}
              >
                <MenuItem value="any">Any</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>

              <TextField
                select
                label="Filter by discount type"
                value={filterOption.discountType}
                onChange={e =>
                  setFilterOption(prev => ({
                    ...prev,
                    discountType: e.target.value,
                  }))
                }
                fullWidth
                size="small"
                sx={{ mt: 3 }}
              >
                <MenuItem value="any">Any</MenuItem>
                <MenuItem value="discount_fixed">Fixed</MenuItem>
                <MenuItem value="discount_percent">Percent</MenuItem>
              </TextField>

              <TextField
                select
                label="Filter by condition type"
                value={filterOption.conditionType}
                onChange={e =>
                  setFilterOption(prev => ({
                    ...prev,
                    conditionType: e.target.value,
                  }))
                }
                fullWidth
                size="small"
                sx={{ mt: 3 }}
              >
                <MenuItem value="any">Any</MenuItem>
                <MenuItem value="first_order">First Order</MenuItem>
                <MenuItem value="cart_value">Cart Value</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </TextField>
            </Box>
          </Box>
        </Drawer>
      </>
    </>
  );
}
