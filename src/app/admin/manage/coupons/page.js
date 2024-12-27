"use client"; // Ensure this is the first line if using client-side hooks

import { useState, useEffect } from 'react';
import {
    Container,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Snackbar,
    Checkbox,
    FormControlLabel,
    Stack,
    Typography,
    Switch,
    Tooltip,
    Grid,
    Box,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    CardActions,
    Divider,
    InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { format } from 'date-fns';

const CouponPage = () => {
    const [coupons, setCoupons] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        validFrom: '',
        validUntil: '',
        maxUses: 10000,
        isActive: false,
        showAsCard: false,
        description: '',
        minimumPurchasePrice: 0,
        usagePerUser: 1,
    });
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await fetch('/api/admin/manage/coupons');
            if (!res.ok) {
                throw new Error('Failed to fetch coupons.');
            }
            const data = await res.json();
            setCoupons(data);
        } catch (error) {
            console.error(error);
            setSnackbarMessage('Error fetching coupons.');
        }
    };

    const handleDialogOpen = (coupon = null) => {
        if (coupon) {
            setCurrentCoupon({
                code: coupon.code || '',
                discountType: coupon.discountType || 'percentage',
                discountValue: coupon.discountValue || 0,
                validFrom: coupon.validFrom ? format(new Date(coupon.validFrom), 'yyyy-MM-dd') : '',
                validUntil: coupon.validUntil ? format(new Date(coupon.validUntil), 'yyyy-MM-dd') : '',
                maxUses: coupon.maxUses || 10000,
                isActive: coupon.isActive || false,
                showAsCard: coupon.showAsCard || false,
                description: coupon.description || '',
                minimumPurchasePrice: coupon.minimumPurchasePrice || 0,
                usagePerUser: coupon.usagePerUser || 1,
                _id: coupon._id || null, // Ensure _id is handled
            });
        } else {
            setCurrentCoupon({
                code: '',
                discountType: 'percentage',
                discountValue: 0,
                validFrom: '',
                validUntil: '',
                maxUses: 10000,
                isActive: false,
                showAsCard: false,
                description: '',
                minimumPurchasePrice: 0,
                usagePerUser: 1,
                _id: null,
            });
        }
        setOpenDialog(true);
    };

    const handleDialogClose = () => {
        setCurrentCoupon({
            code: '',
            discountType: 'percentage',
            discountValue: 0,
            validFrom: '',
            validUntil: '',
            maxUses: 10000,
            isActive: false,
            showAsCard: false,
            description: '',
            minimumPurchasePrice: 0,
            usagePerUser: 1,
            _id: null,
        });
        setOpenDialog(false);
    };

    const handleSaveCoupon = async () => {
        // Basic validation
        if (!currentCoupon.code || !currentCoupon.validFrom || !currentCoupon.validUntil) {
            setSnackbarMessage('Please fill all required fields.');
            return;
        }

        // Ensure validUntil is after validFrom
        if (new Date(currentCoupon.validUntil) <= new Date(currentCoupon.validFrom)) {
            setSnackbarMessage('Valid Until date must be after Valid From date.');
            return;
        }

        const method = currentCoupon._id ? 'PUT' : 'POST';
        const endpoint = currentCoupon._id
            ? `/api/admin/manage/coupons/${currentCoupon._id}`
            : '/api/admin/manage/coupons';

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentCoupon),
            });

            if (res.ok) {
                setSnackbarMessage(`Coupon ${currentCoupon._id ? 'updated' : 'created'} successfully!`);
                fetchCoupons();
                handleDialogClose();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error saving coupon.');
            }
        } catch (error) {
            console.error('Save Coupon Error:', error);
            setSnackbarMessage(`Error: ${error.message}`);
        }
    };

    const handleDeleteCoupon = async (id) => {
        if (confirm('Are you sure you want to delete this coupon?')) {
            try {
                const res = await fetch(`/api/admin/manage/coupons/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setSnackbarMessage('Coupon deleted successfully!');
                    fetchCoupons();
                } else {
                    const errorData = await res.json();
                    setSnackbarMessage(`Error: ${errorData.error || 'Failed to delete coupon.'}`);
                }
            } catch (error) {
                console.error('Delete Coupon Error:', error);
                setSnackbarMessage(`Error: ${error.message}`);
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;

        // Ensure code is always uppercase
        if (name === 'code') {
            newValue = newValue.toUpperCase();
        }

        setCurrentCoupon((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const generateRandomCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setCurrentCoupon((prev) => ({ ...prev, code }));
    };

    const handleToggleActive = async (id, isActive) => {
        try {
            const res = await fetch(`/api/admin/manage/coupons/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive }),
            });

            if (res.ok) {
                setSnackbarMessage('Coupon status updated successfully!');
                fetchCoupons();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error updating coupon status.');
            }
        } catch (error) {
            console.error('Toggle Active Error:', error);
            setSnackbarMessage(`Error: ${error.message}`);
        }
    };

    return (
        <Container sx={{ marginTop: '20px', color: 'white' }}>
            <Typography variant={isSmallScreen ? "h5" : "h4"} align="center" gutterBottom>
                Manage Coupons
            </Typography>
            <Grid container justifyContent="flex-end" sx={{ marginBottom: '20px' }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => handleDialogOpen()}
                    fullWidth={isSmallScreen}
                >
                    Add Coupon
                </Button>
            </Grid>

            {/* Conditional Rendering: Table for Large Screens, Cards for Small Screens */}
            {isSmallScreen ? (
                <Grid container spacing={2}>
                    {coupons.map((coupon) => (
                        <Grid item xs={12} key={coupon._id}>
                            <Card sx={{ backgroundColor: '#424242', color: 'white' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {coupon.code}
                                    </Typography>
                                    <Divider sx={{ backgroundColor: 'grey.500', marginY: 1 }} />
                                    <Typography variant="body1">
                                        <strong>Type:</strong>{' '}
                                        {coupon.discountType.charAt(0).toUpperCase() + coupon.discountType.slice(1)}
                                    </Typography>
                                    <Typography variant="body1">
                                        <strong>Value:</strong>{' '}
                                        {coupon.discountType === 'percentage'
                                            ? `${coupon.discountValue}%`
                                            : `₹${coupon.discountValue}`}
                                    </Typography>
                                    {/* <Typography variant="body1">
                                        <strong>Description:</strong> {coupon.description || 'N/A'}
                                    </Typography> */}
                                    <Typography variant="body1">
                                        <strong>Valid From:</strong> {format(new Date(coupon.validFrom), 'yyyy-MM-dd')}
                                    </Typography>
                                    <Typography variant="body1">
                                        <strong>Valid Until:</strong> {format(new Date(coupon.validUntil), 'yyyy-MM-dd')}
                                    </Typography>
                                    <Typography variant="body1">
                                        <strong>Minimum Purchase:</strong> ₹{coupon.minimumPurchasePrice}
                                    </Typography>
                                    {/* <Typography variant="body1">
                                        <strong>Max Uses:</strong> {coupon.maxUses}
                                    </Typography> */}
                                    {/* <Typography variant="body1">
                                        <strong>Usage Per User:</strong> {coupon.usagePerUser}
                                    </Typography> */}
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={coupon.showAsCard}
                                                disabled
                                                color="primary"
                                            />
                                        }
                                        label="Show as Card"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={coupon.isActive}
                                                onChange={(e) => handleToggleActive(coupon._id, e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Active"
                                    />
                                </CardContent>
                                <CardActions>
                                    <Tooltip title="Edit Coupon">
                                        <IconButton color="primary" onClick={() => handleDialogOpen(coupon)}>
                                            <Edit />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Coupon">
                                        <IconButton color="secondary" onClick={() => handleDeleteCoupon(coupon._id)}>
                                            <Delete />
                                        </IconButton>
                                    </Tooltip>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <TableContainer component={Paper} sx={{ backgroundColor: '#424242', overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Code</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Valid From</TableCell>
                                <TableCell>Valid Until</TableCell>
                                <TableCell>Minimum Purchase</TableCell>
                                {/* <TableCell>Max Uses</TableCell> */}
                                <TableCell>Show as Card</TableCell>
                                <TableCell>Active</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {coupons.map((coupon) => (
                                <TableRow key={coupon._id}>
                                    <TableCell>{coupon.code}</TableCell>
                                    <TableCell>
                                        {coupon.discountType.charAt(0).toUpperCase() + coupon.discountType.slice(1)}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.discountType === 'percentage'
                                            ? `${coupon.discountValue}%`
                                            : `₹${coupon.discountValue}`}
                                    </TableCell>
                                    <TableCell>{format(new Date(coupon.validFrom), 'yyyy-MM-dd')}</TableCell>
                                    <TableCell>{format(new Date(coupon.validUntil), 'yyyy-MM-dd')}</TableCell>
                                    <TableCell>₹ {coupon.minimumPurchasePrice}</TableCell>
                                    <TableCell>
                                        <Checkbox checked={coupon.showAsCard} disabled />
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={coupon.isActive}
                                            onChange={(e) => handleToggleActive(coupon._id, e.target.checked)}
                                            color="primary"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Edit Coupon">
                                            <IconButton color="primary" onClick={() => handleDialogOpen(coupon)}>
                                                <Edit />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Coupon">
                                            <IconButton color="secondary" onClick={() => handleDeleteCoupon(coupon._id)}>
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add/Edit Coupon Dialog */}
            <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {currentCoupon._id ? 'Edit Coupon' : 'Add Coupon'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ marginTop: 2 }}>
                        {/* Code and Generate Button */}
                        <Stack direction={isSmallScreen ? "column" : "row"} spacing={2} alignItems="center">
                            <TextField
                                name="code"
                                label="Code"
                                variant="outlined"
                                value={currentCoupon.code}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                helperText="Either generate a random code or enter your own, e.g., 'FESTIVE500'"
                            />
                            <Button
                                onClick={generateRandomCode}
                                variant="contained"
                                color="primary"
                                sx={{ whiteSpace: 'nowrap', width: isSmallScreen ? '100%' : 'auto' }}
                            >
                                Generate
                            </Button>
                        </Stack>

                        {/* Show as Card */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={currentCoupon.showAsCard}
                                    onChange={handleInputChange}
                                    name="showAsCard"
                                    color="primary"
                                />
                            }
                            label="Show as Card"
                        />

                        {/* Description */}
                        <TextField
                            name="description"
                            label="Description"
                            variant="outlined"
                            value={currentCoupon.description}
                            onChange={handleInputChange}
                            fullWidth
                            multiline
                            rows={3}
                        />

                        {/* Discount Type */}
                        <TextField
                            select
                            name="discountType"
                            label="Discount Type"
                            variant="outlined"
                            value={currentCoupon.discountType}
                            onChange={handleInputChange}
                            fullWidth
                            required
                        >
                            <MenuItem value="percentage">Percentage</MenuItem>
                            <MenuItem value="fixed">Fixed</MenuItem>
                        </TextField>

                        {/* Discount Value */}
                        <TextField
                            name="discountValue"
                            label="Discount Value"
                            type="number"
                            variant="outlined"
                            value={currentCoupon.discountValue}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            inputProps={{ min: 0 }}
                            helperText={
                                currentCoupon.discountType === 'percentage'
                                    ? 'Enter percentage value (e.g., 20 for 20%)'
                                    : 'Enter fixed amount (e.g., 500 for ₹500)'
                            }
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {currentCoupon.discountType === 'percentage' ? '%' : '₹'}
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Minimum Purchase Price */}
                        <TextField
                            name="minimumPurchasePrice"
                            label="Minimum Purchase Price (₹)"
                            type="number"
                            variant="outlined"
                            value={currentCoupon.minimumPurchasePrice}
                            onChange={handleInputChange}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />

                        {/* Valid From */}
                        <TextField
                            name="validFrom"
                            label="Valid From"
                            type="date"
                            variant="outlined"
                            value={currentCoupon.validFrom}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{
                                shrink: true,
                            }}
                            required
                        />

                        {/* Valid Until */}
                        <TextField
                            name="validUntil"
                            label="Valid Until"
                            type="date"
                            variant="outlined"
                            value={currentCoupon.validUntil}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{
                                shrink: true,
                            }}
                            required
                        />

                        {/* Max Uses */}
                        {/* <TextField
                            name="maxUses"
                            label="Max Uses"
                            type="number"
                            variant="outlined"
                            value={currentCoupon.maxUses}
                            onChange={handleInputChange}
                            fullWidth
                            inputProps={{ min: 0 }}
                        /> */}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleSaveCoupon} color="primary" variant="contained">
                        {currentCoupon._id ? 'Update' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={!!snackbarMessage}
                autoHideDuration={3000}
                message={snackbarMessage}
                onClose={() => setSnackbarMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );

};

export default CouponPage;
