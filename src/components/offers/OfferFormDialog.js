import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Box,
  MenuItem,
  Tooltip,
  InputAdornment,
  IconButton,
  Typography,
  FormControlLabel,
  Switch,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CasinoOutlinedIcon from "@mui/icons-material/CasinoOutlined";
import OfferCard from "@/components/offers/OfferCard.js";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";

const defaultFormData = {
  name: "",
  description: "",
  actions: [{ type: "", discountValue: "" }],
  conditions: [{ type: "", value: null }],
  conditionMessage: "",
  validFrom: "",
  validUntil: "",
  couponCodes: [""],
  showAsCard: false,
  autoApply: false,
  discountCap: null, // null means discountCap is disabled
  isActive: true,
};

const defaultTouched = {
  actionType: false,
  discountValue: false,
  conditionType: false,
  name: false,
  discountCap: false,
};

const steps = ["Action", "Conditions", "Offer", "Coupon Codes", "Submit"];

export default function OffersFormDialog({
  open,
  onClose,
  setOffers,
  setSuccessAlert,
  setErrorAlert,
  oldData,
  isCreateNewOffer,
}) {
  const [activeStep, setActiveStep] = useState(0);

  const [formData, setFormData] = useState(
    isCreateNewOffer
      ? defaultFormData
      : { ...oldData, couponCodes: [], validFrom: oldData.validFrom.slice(0, 10), validUntil: oldData.validUntil.slice(0, 10) }
  );

  const [touched, setTouched] = useState(defaultTouched);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isCreateNewOffer) {
      setTimeout(
        () =>
          setFormData({
            ...oldData,
            couponCodes: [],
            validFrom: oldData.validFrom.slice(0, 10),
            validUntil: oldData.validUntil.slice(0, 10),
          }),
        500
      );
    }
  }, [isCreateNewOffer, oldData, open]);

  useEffect(() => {
    function setConditionMessage() {
      const newConditionMessage = !formData.conditions[0].type // when no condition set
        ? ""
        : (formData.conditions[1]?.type // when both conditions (cart_value and first_order) set
            ? `Order for the first time and add items worth ₹${
                formData.conditions[0].type === "cart_value"
                  ? formData.conditions[0].value || "XX"
                  : formData.conditions[1].value || "XX"
              }`
            : formData.conditions[0].type === "first_order"
            ? "Order for the first time" // only 1 condition (first_order) set
            : `Add items worth ₹${formData.conditions[0].value || "XX"}`) + // only 1 condition (cart_value) set
          ` to avail ${
            formData.actions[0].type === "discount_percent"
              ? `${formData.actions[0].discountValue || "XX"}% off`
              : `₹${formData.actions[0].discountValue || "XX"} off`
          }${formData.discountCap !== null ? ` upto ₹${formData.discountCap || "XX"}` : ""}`;
      // when formData.discountCap is not set, it will be null

      setFormData(prev => ({ ...prev, conditionMessage: newConditionMessage }));
    }

    setConditionMessage();
  }, [formData.actions, formData.conditions, formData.discountCap]);

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }

  async function handleCreateNewOffer() {
    const res = await fetch("/api/admin/manage/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message ?? "Failed to create offer");
    }

    const data = await res.json();

    setOffers(prev => [...prev, data]);

    setTimeout(() => {
      setFormData(defaultFormData);
      setTouched(defaultTouched);
      setActiveStep(0);
    }, 500);
  }

  async function handleEditOffer() {
    const res = await fetch(`/api/admin/manage/offers/${oldData._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message ?? "Failed to edit offer");
    }

    const data = await res.json();

    setOffers(prevOffers => prevOffers.map(offer => (offer._id === oldData._id ? data : offer)));
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      await (isCreateNewOffer ? handleCreateNewOffer() : handleEditOffer());
      setSuccessAlert(true);
      onClose();
    } catch (error) {
      setErrorAlert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  // These steps contain input fields that you see in each step in the ui
  const invalidDateRange =
    formData.validFrom && formData.validUntil && new Date(formData.validFrom) >= new Date(formData.validUntil);

  // invalidSteps[i] === true means data provided at step i is invalid
  const invalidSteps = [
    !formData.actions[0].type ||
      !formData.actions[0].discountValue ||
      (formData.actions[0].type === "discount_percent" && formData.discountCap === ""),
    formData.conditions.some(({ type, value }) => !type || !value),
    !formData.name || !formData.validFrom || !formData.validUntil || invalidDateRange,
    isCreateNewOffer && formData.couponCodes.some(cc => !cc),
  ];

  const disableNextButton =
    (activeStep === 0 && invalidSteps[0]) ||
    (activeStep === 1 && invalidSteps[1]) ||
    (activeStep === 2 && invalidSteps[2]) ||
    (activeStep === 3 && invalidSteps[3]);

  const step0 = (
    <>
      <TextField
        required
        disabled={submitting || !isCreateNewOffer}
        key="type"
        select
        label="Discount Type"
        fullWidth
        margin="normal"
        value={formData.actions[0].type}
        onChange={e => {
          setFormData(prev => ({
            ...prev,
            actions: [{ type: e.target.value, discountValue: "" }],
            discountCap: null,
          }));
          setTouched(prev => ({ ...prev, type: true, discountCap: false, discountValue: false }));
        }}
        error={touched.actionType && !formData.actions[0].type}
        helperText={touched.actionType && !formData.actions[0].type ? "Discount type is required" : ""}
        sx={{ minWidth: "11rem" }}
      >
        <MenuItem value="" disabled sx={{ fontSize: "0.9rem" }}>
          Select discount type
        </MenuItem>

        <MenuItem value="discount_percent">
          <Tooltip title="Apply percentage-based discount (e.g., 5% off)" disableInteractive>
            <Box width="100%">Percentage Discount</Box>
          </Tooltip>
        </MenuItem>
        <MenuItem value="discount_fixed">
          <Tooltip title="Apply a fixed amount off (e.g., ₹100 off)" disableInteractive>
            <Box width="100%">Fixed Discount</Box>
          </Tooltip>
        </MenuItem>
        <MenuItem value="free_item" disabled>
          <Tooltip title="Add a free item with the order" disableInteractive>
            <Box width="100%">Free Item</Box>
          </Tooltip>
        </MenuItem>
        <MenuItem value="bogo" disabled>
          <Tooltip title="Buy one get one free deal" disableInteractive>
            <Box width="100%">Buy One Get One</Box>
          </Tooltip>
        </MenuItem>
      </TextField>

      {formData.actions[0].type ? (
        <TextField
          required
          disabled={!formData.actions[0].type || submitting}
          key="discountValue"
          type="number"
          label="Discount Value"
          value={formData.actions[0].discountValue}
          onKeyDown={e => {
            if (["e", "+", "-"].includes(e.key) || (e.key === "0" && !Number(e.target.value))) {
              e.preventDefault();
            }
          }}
          onChange={e => {
            setFormData(prev => ({
              ...prev,
              actions: [
                {
                  type: prev.actions[0].type,
                  discountValue:
                    e.target.value < 0 || (prev.actions[0].type === "discount_percent" && e.target.value > 100)
                      ? prev.actions[0].discountValue
                      : e.target.value,
                },
              ],
            }));
            setTouched(prev => ({ ...prev, discountValue: true }));
          }}
          size="small"
          fullWidth
          margin="normal"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {formData.actions[0].type === "discount_percent"
                    ? "%"
                    : formData.actions[0].type === "discount_fixed"
                    ? "₹"
                    : ""}
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& input[type=number]::-webkit-outer-spin-button": { display: "none" },
            "& input[type=number]::-webkit-inner-spin-button": { display: "none" },
            "& input[type=number]": { MozAppearance: "textfield" },
          }}
          error={touched.discountValue && !Number(formData.actions[0].discountValue)}
          helperText={touched.discountValue && !Number(formData.actions[0].discountValue) ? "Discount value is required" : ""}
        />
      ) : null}

      {formData.actions[0].type === "discount_percent" && (
        <Box display="flex" alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={formData.discountCap != null}
                disabled={submitting}
                color="default"
                sx={{
                  marginLeft: 1,
                  "& .MuiSwitch-track": {
                    opacity: formData.discountCap !== null ? 1 : 0.4,
                    backgroundColor: formData.discountCap !== null ? "#D3D3D3" : "#766f6e",
                  },
                }}
                onChange={e => {
                  setFormData(prev => ({
                    ...prev,
                    discountCap: !e.target.checked ? null : isCreateNewOffer ? "" : oldData.discountCap,
                  }));
                }}
              />
            }
            label="Set Discount Cap"
          />
          <Tooltip title="Maximum discount in ruppees can not exceed discount cap" disableInteractive>
            <HelpOutlineIcon sx={{ cursor: "pointer", opacity: 0.7 }} />
          </Tooltip>
        </Box>
      )}

      {formData.actions[0].type === "discount_percent" && formData.discountCap !== null && (
        <TextField
          required
          disabled={!formData.actions[0].type || submitting}
          key="discountCap"
          type="number"
          label="Discount Cap"
          value={formData.discountCap}
          onKeyDown={e => {
            if (["e", "+", "-"].includes(e.key) || (e.key === "0" && !Number(e.target.value))) {
              e.preventDefault();
            }
          }}
          onChange={e => {
            handleChange("discountCap", e.target.value);
          }}
          size="small"
          fullWidth
          margin="normal"
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            },
          }}
          sx={{
            "& input[type=number]::-webkit-outer-spin-button": { display: "none" },
            "& input[type=number]::-webkit-inner-spin-button": { display: "none" },
            "& input[type=number]": { MozAppearance: "textfield" },
          }}
          error={touched.discountCap && !Number(formData.discountCap)}
          helperText={touched.discountCap && !Number(formData.discountCap) ? "Please fill this field" : ""}
        />
      )}
    </>
  );

  const step1 = (
    <>
      <Box display="flex" flexDirection="column" gap={2} mt={2}>
        {formData.conditions.map(({ type, value }, i) => (
          <Box key={i}>
            <Box display="flex" alignItems="center">
              <Box
                display="flex"
                gap={2}
                alignItems="center"
                sx={{
                  width: "100%",
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                <TextField
                  select
                  label="Condition Type"
                  disabled={submitting}
                  value={type}
                  required
                  onChange={e => {
                    setFormData(prev => ({
                      ...prev,
                      conditions: prev.conditions.map((condition, idx) =>
                        i === idx ? { type: e.target.value, value: e.target.value === "first_order" ? true : "" } : condition
                      ),
                    }));
                  }}
                  sx={{ flexBasis: "250%" }}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="" disabled sx={{ fontSize: "0.9rem" }}>
                    Select Condition Type
                  </MenuItem>

                  {(type === "first_order" ||
                    type === "order_count_by_user" ||
                    !formData.conditions.some(({ type }) => type === "first_order" || type === "order_count_by_user")) && (
                    <MenuItem value="first_order">
                      <Tooltip title="Checks if the order is the customer's first order" disableInteractive>
                        <Box width="100%">First Order</Box>
                      </Tooltip>
                    </MenuItem>
                  )}

                  {(type === "cart_value" || !formData.conditions.some(({ type }) => type === "cart_value")) && (
                    <MenuItem value="cart_value">
                      <Tooltip title="Checks if the cart's total value meets the criteria" disableInteractive>
                        <Box width="100%">Cart Value</Box>
                      </Tooltip>
                    </MenuItem>
                  )}

                  {(type === "item_count" || !formData.conditions.some(({ type }) => type === "item_count")) && (
                    <MenuItem value="item_count" disabled>
                      <Tooltip title="Checks if the number of items in the cart meets the criteria" disableInteractive>
                        <Box width="100%">Item Count</Box>
                      </Tooltip>
                    </MenuItem>
                  )}

                  {(type === "order_count_by_user" ||
                    type === "first_order" ||
                    !formData.conditions.some(({ type }) => type === "order_count_by_user" || type === "first_order")) && (
                    <MenuItem value="order_count_by_user" disabled>
                      <Tooltip title="Checks if the total order count of customer meets a criteria" disableInteractive>
                        <Box width="100%">Order Count</Box>
                      </Tooltip>
                    </MenuItem>
                  )}
                </TextField>

                {type && type !== "first_order" && (
                  <TextField
                    label="Value"
                    type="number"
                    disabled={submitting}
                    required
                    value={value}
                    onKeyDown={e => {
                      if (["e", "+", "-"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      setFormData(prev => ({
                        ...prev,
                        conditions: prev.conditions.map((condition, idx) =>
                          i === idx ? { ...condition, value: e.target.value } : condition
                        ),
                      }));
                    }}
                    size="small"
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">{type === "cart_value" ? "₹" : ""}</InputAdornment>,
                      },
                    }}
                    sx={{
                      "& input[type=number]::-webkit-outer-spin-button": { display: "none" },
                      "& input[type=number]::-webkit-inner-spin-button": { display: "none" },
                      "& input[type=number]": { MozAppearance: "textfield" },
                    }}
                  />
                )}
              </Box>
              {formData.conditions.length > 1 && (
                <Tooltip title="Click here to remove this condition" disableInteractive>
                  <IconButton
                    disabled={submitting}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, conditions: prev.conditions.filter((_, idx) => idx !== i) }));
                    }}
                    sx={{ mt: "4px" }}
                  >
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" mt={1} sx={{ fontSize: "0.8rem" }}>
              {!type
                ? "Selct a condition type"
                : type === "cart_value"
                ? value
                  ? `Customer must add items worth ₹ ${value} or more to their cart for this offer`
                  : "Select minimum cart value for this offer"
                : type === "item_count"
                ? value
                  ? `Customers must add ${value} or more items to their cart for this offer`
                  : "Select minimum cart items for this offer"
                : type === "first_order"
                ? "It must be customer's first order for this offer"
                : type === "order_count_by_user"
                ? value
                  ? `Customer must have ordered ${value} or more times for this offer`
                  : "Select minimum order count for this offer"
                : ""}
            </Typography>
          </Box>
        ))}

        <Box display="flex" flexDirection="column">
          {/* make this length < 3 when all the four condition types are enabled */}
          {formData.conditions.length < 2 && (
            <Button
              variant="outlined"
              disabled={submitting}
              startIcon={<AddIcon />}
              onClick={() =>
                setFormData(prev => ({
                  ...prev,
                  conditions: [...prev.conditions, { type: "", value: "" }],
                }))
              }
              sx={{
                width: "auto",
                textTransform: "none",
                fontWeight: 500,
                borderRadius: 1.5,
              }}
            >
              Add another condition
            </Button>
          )}
          {formData.conditions.length > 1 && (
            <Typography variant="caption" color="text.secondary" mt={1} sx={{ fontStyle: "italic" }}>
              *{formData.conditions.length == 2 ? "Both the" : "All these"} conditions must be met to avail this offer
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );

  const step2 = (
    <>
      <TextField
        key="name"
        label="Offer Name"
        value={formData.name}
        onChange={e => handleChange("name", e.target.value.trimStart())}
        disabled={submitting}
        required
        fullWidth
        margin="normal"
        size="small"
        slotProps={{ htmlInput: { maxLength: 200 } }}
        error={touched.name && !formData.name}
        helperText={touched.name && !formData.name ? "Offer name is required" : ""}
      />
      <TextField
        key="description"
        label="Description"
        value={formData.description}
        onChange={e => handleChange("description", e.target.value.trimStart())}
        disabled={submitting}
        multiline
        rows={4}
        fullWidth
        margin="normal"
        size="small"
        slotProps={{ htmlInput: { maxLength: 1000 } }}
        placeholder="Enter offer description (max 1000 chars)"
        // use this to hide scrollbar if you want
        // sx={{
        //   "& .MuiInputBase-root": {
        //     overflow: "hidden",
        //   },
        //   "& textarea": {
        //     overflow: "hidden !important",
        //     resize: "none",
        //   },
        // }}
      />
      <Box
        display="flex"
        gap={2}
        marginTop={2}
        sx={{
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <TextField
          key="validFrom"
          label="Valid From"
          type="date"
          required
          value={formData.validFrom}
          disabled={submitting}
          onChange={e => handleChange("validFrom", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          error={invalidDateRange}
          helperText={invalidDateRange ? "Start date must be before end date" : ""}
          fullWidth
          size="small"
        />

        <TextField
          key="validUntil"
          label="Valid Until"
          type="date"
          required
          value={formData.validUntil}
          disabled={submitting}
          onChange={e => handleChange("validUntil", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          error={invalidDateRange}
          helperText={invalidDateRange ? "End date must be after start date" : ""}
          fullWidth
          size="small"
        />
      </Box>
    </>
  );

  const step3 = (
    <Box sx={{ overflowY: "auto", pr: 1 }}>
      {[...(oldData?.couponCodes ?? []), ...formData.couponCodes].map((code, i) => (
        <Box key={`coupon-code-${i}`} display="flex" alignItems="start" gap={1} width="100%">
          <TextField
            label={`Coupon Code ${i + 1}`}
            value={code}
            disabled={submitting || i < (oldData?.couponCodes.length ?? 0)}
            onChange={e => {
              setFormData(prev => ({
                ...prev,
                couponCodes: prev.couponCodes.map((cc, idx) =>
                  i - (oldData?.couponCodes.length ?? 0) === idx ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") : cc
                ),
              }));
            }}
            fullWidth
            margin="normal"
            size="small"
            slotProps={{
              htmlInput: { maxLength: 10 },
              input: {
                endAdornment:
                  i >= (oldData?.couponCodes.length ?? 0) ? (
                    <InputAdornment position="end">
                      <Tooltip title="Click here to generate a random coupon code" disableInteractive>
                        <IconButton
                          disabled={submitting}
                          onClick={() => {
                            //generate a random coupon code
                            const randomCc = Array(7)
                              .fill(null)
                              .map(() => {
                                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                                return chars.charAt(Math.floor(Math.random() * chars.length));
                              })
                              .join("");
                            setFormData(prev => ({
                              ...prev,
                              couponCodes: prev.couponCodes.map((cc, idx) =>
                                i - (oldData?.couponCodes.length ?? 0) === idx ? randomCc : cc
                              ),
                            }));
                          }}
                          sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                        >
                          <CasinoOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
              },
            }}
            required
            error={touched.couponCodes && code.trim() === ""}
            helperText={touched.couponCodes && code.trim() === "" ? "Required" : ""}
            sx={{
              "@media (max-width: 600px)": {
                "& .MuiInputBase-root": {
                  paddingRight: "0",
                },
              },
            }}
          />
          {i >= (oldData?.couponCodes.length ?? 1) && (
            <Tooltip title="Click here to remove this coupon code" disableInteractive>
              <IconButton
                disabled={submitting}
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    couponCodes: prev.couponCodes.filter((_, idx) => idx !== i - (oldData?.couponCodes.length ?? 0)),
                  }));
                }}
                sx={{ mt: "1.2rem" }}
              >
                <RemoveCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}

      {/* Add New Coupon Input */}
      <Box mt={2}>
        <Button
          disabled={submitting}
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              couponCodes: [...prev.couponCodes, ""],
            }));
          }}
          sx={{
            width: "100%",
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 1.5,
          }}
        >
          Add another coupon code
        </Button>
      </Box>
    </Box>
  );

  const step4 = (
    <Box display="flex" flexDirection="column" marginLeft="1rem" marginTop="1rem" gap="0.5rem">
      <Box display="flex" alignItems="center">
        <FormControlLabel
          control={
            <Switch
              checked={formData.showAsCard}
              disabled={submitting}
              onChange={e => handleChange("showAsCard", e.target.checked)}
              color="default"
              sx={{
                "& .MuiSwitch-track": {
                  opacity: formData.showAsCard ? 1 : 0.4,
                  backgroundColor: formData.showAsCard ? "#D3D3D3" : "#766f6e",
                },
              }}
            />
          }
          label="Show as Card"
        />
        <Tooltip title="If checked the offer will be displayed as a card in the UI" disableInteractive>
          <HelpOutlineIcon sx={{ cursor: "pointer", opacity: 0.7 }} />
        </Tooltip>
      </Box>
      <Box display="flex" alignItems="center">
        <FormControlLabel
          control={
            <Switch
              checked={formData.autoApply}
              disabled={submitting}
              onChange={e => handleChange("autoApply", e.target.checked)}
              color="primary"
              sx={{
                "& .MuiSwitch-track": {
                  opacity: formData.autoApply ? 1 : 0.4,
                  backgroundColor: formData.autoApply ? "#D3D3D3" : "#766f6e",
                },
              }}
            />
          }
          label="Auto Apply"
        />
        <Tooltip title="If checked the offer will be applied automatically when conditions are met" disableInteractive>
          <HelpOutlineIcon sx={{ cursor: "pointer", opacity: 0.7 }} />
        </Tooltip>
      </Box>
    </Box>
  );

  const stepContent = [step0, step1, step2, step3, step4];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {isCreateNewOffer ? "Create" : "Edit"} Offer Form
        <IconButton
          color="inherit"
          onClick={onClose}
          aria-label="close"
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "white",
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ "@media (max-width: 600px)": { p: "0.3rem" } }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label, i) => (
            <Step key={label}>
              <StepLabel
                onClick={() => {
                  for (let j = 0; j < i; j++) if (invalidSteps[j]) return;
                  setActiveStep(i);
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={5} marginX={4} alignItems="center" flexWrap="wrap">
          {/* Preview Card */}
          <OfferCard isInDialog={true} offerData={formData} />

          {/* Input Fields */}
          <Box
            flex={2}
            sx={{
              overflowY: "auto",
              pr: 1,
              "@media (max-width: 600px)": {
                ml: -2,
              },
            }}
          >
            {stepContent[activeStep]}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Box marginRight={2} marginBottom={2} gap={1} display="flex">
          <Button
            onClick={() => {
              setActiveStep(prev => Math.max(prev - 1, 0));
            }}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          <Button
            onClick={() => {
              if (activeStep < steps.length - 1) {
                setActiveStep(prev => prev + 1);
              } else {
                handleSubmit();
              }
            }}
            variant="contained"
            disabled={disableNextButton || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : activeStep === steps.length - 1 ? "Submit" : "Next"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// edit only name, description, value, caption, coupon codes (type no change)
