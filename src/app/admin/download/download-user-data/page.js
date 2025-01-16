"use client";
import { useState } from 'react';
import {
    Container,
    TextField,
    Chip,
    Stack,
    Button,
    Typography,
    Box,
    FormControl,
    FormControlLabel,
    Checkbox,
    FormGroup,
    Slider,
    FormLabel,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    CircularProgress,
    Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import * as FileSaver from 'file-saver';
import dayjs from 'dayjs';

const DownloadCustomersData = () => {
    // Date Filter State
    const [applyDateFilter, setApplyDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState('all'); // Single select

    // Custom Date Range State
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);

    // Item Filters State
    const [applyItemFilter, setApplyItemFilter] = useState(false);
    const [items, setItems] = useState([]); // Selected items

    // Tags State
    const [tags, setTags] = useState(''); // Custom Tags

    // Column Selection State
    const availableColumns = [
        { label: 'Full Name', value: 'fullName', default: true },
        { label: 'Phone Number', value: 'phoneNumber', default: true },
        { label: 'First Name', value: 'firstName' },
        { label: 'Last Name', value: 'lastName' },
        // { label: 'City', value: 'city' },
        { label: 'Orders Count', value: 'purchaseCount' },
        { label: 'Item Purchase Counts', value: 'itemPurchaseCounts' },
        { label: 'Total Amount Spent', value: 'totalAmountSpent' },
        { label: 'UTM Source', value: 'utmSource' },
        { label: 'UTM Medium', value: 'utmMedium' },
        { label: 'UTM Campaign', value: 'utmCampaign' },
        // { label: 'Specific Category', value: 'specificCategory' },
    ];

    const [selectedColumns, setSelectedColumns] = useState(
        availableColumns.filter(col => col.default).map(col => col.value)
    );

    const handleColumnChange = (column) => {
        setSelectedColumns((prev) =>
            prev.includes(column)
                ? prev.filter((col) => col !== column)
                : [...prev, column]
        );
    };

    // Customer Loyalty Filter State
    const [applyLoyaltyFilter, setApplyLoyaltyFilter] = useState(false);
    const [loyaltyFilters, setLoyaltyFilters] = useState({
        minAmountSpent: { checked: false, value: 0 },
        minNumberOfOrders: { checked: false, value: 0 },
        minItemsCount: { checked: false, value: 0 },
    });

    const handleLoyaltyFilterChange = (filter) => {
        setLoyaltyFilters((prev) => ({
            ...prev,
            [filter]: {
                ...prev[filter],
                checked: !prev[filter].checked,
            },
        }));
    };

    const handleLoyaltySliderChange = (filter, newValue) => {
        setLoyaltyFilters((prev) => ({
            ...prev,
            [filter]: {
                ...prev[filter],
                value: newValue,
            },
        }));
    };

    const availableItems = ['Graphic Helmets', 'Full Bike Wraps', 'Tank Wraps', 'Bonnet Wraps', 'Window Pillar Wraps'];

    // Handle Date Range Selection
    const handleDateRangeChange = (range) => {
        setDateRange(range);
    };

    // Download State
    const [isDownloading, setIsDownloading] = useState(false);

    // Handle Download CSV
    const handleDownloadCSV = async () => {
        const query = {};

        // Payment Status is always 'successful'
        query.paymentStatus = ['allPaid', 'paidPartially'];

        // Apply Date Filter
        if (applyDateFilter) {
            const dateConditions = [];

            const today = dayjs().startOf('day');
            switch (dateRange) {
                case 'today':
                    dateConditions.push({
                        createdAt: {
                            $gte: today.toDate(),
                            $lte: today.endOf('day').toDate(),
                        },
                    });
                    break;
                case 'yesterday':
                    const yesterday = dayjs().subtract(1, 'day').startOf('day');
                    dateConditions.push({
                        createdAt: {
                            $gte: yesterday.toDate(),
                            $lte: yesterday.endOf('day').toDate(),
                        },
                    });
                    break;
                case 'lastWeek':
                    const lastWeek = dayjs().subtract(7, 'day').startOf('day');
                    dateConditions.push({
                        createdAt: {
                            $gte: lastWeek.toDate(),
                        },
                    });
                    break;
                case 'thisMonth':
                    const startOfMonth = dayjs().startOf('month').toDate();
                    dateConditions.push({
                        createdAt: {
                            $gte: startOfMonth,
                        },
                    });
                    break;
                case 'custom':
                    if (customStartDate && customEndDate) {
                        dateConditions.push({
                            createdAt: {
                                $gte: dayjs(customStartDate).startOf('day').toDate(),
                                $lte: dayjs(customEndDate).endOf('day').toDate(),
                            },
                        });
                    } else if (customStartDate) {
                        dateConditions.push({
                            createdAt: {
                                $gte: dayjs(customStartDate).startOf('day').toDate(),
                            },
                        });
                    } else if (customEndDate) {
                        dateConditions.push({
                            createdAt: {
                                $lte: dayjs(customEndDate).endOf('day').toDate(),
                            },
                        });
                    }
                    break;
                case 'all':
                default:
                    // No date filter
                    break;
            }

            if (dateConditions.length > 0) {
                query.createdAt = { $or: dateConditions };
            }
        }

        // Apply Item Filters
        if (applyItemFilter && items.length > 0) {
            query.items = items;
        }

        // Apply Customer Loyalty Filters
        if (applyLoyaltyFilter) {
            const loyaltyConditions = {};
            if (loyaltyFilters.minAmountSpent.checked) {
                loyaltyConditions.minAmountSpent = loyaltyFilters.minAmountSpent.value;
            }
            if (loyaltyFilters.minNumberOfOrders.checked) {
                loyaltyConditions.minNumberOfOrders = loyaltyFilters.minNumberOfOrders.value;
            }
            if (loyaltyFilters.minItemsCount.checked) {
                loyaltyConditions.minItemsCount = loyaltyFilters.minItemsCount.value;
            }
            if (Object.keys(loyaltyConditions).length > 0) {
                query.loyalty = loyaltyConditions;
            }
        }

        // Selected Columns
        query.columns = selectedColumns;

        // Tags
        if (tags.trim() !== '') {
            query.tags = tags.trim();
        }

        try {
            setIsDownloading(true);
            // Serialize the query object to a JSON string
            const serializedQuery = JSON.stringify(query);

            // Fetch the CSV from the API
            const res = await fetch(`/api/admin/download/download-user-data?query=${encodeURIComponent(serializedQuery)}`);
            if (!res.ok) {
                const errorData = await res.json();
                console.error('Error:', errorData.message);
                alert(`Error: ${errorData.message}`);
                setIsDownloading(false);
                return;
            }
            const blob = await res.blob(); // Expecting a CSV blob
            FileSaver.saveAs(blob, 'customers_data.csv');
            setIsDownloading(false);
        } catch (error) {
            console.error('Download error:', error);
            alert(`Download failed: ${error.message}`);
            setIsDownloading(false);
        }
    };

    return (
        <Container maxWidth='lg' sx={{ padding: '2rem 0' }}>
            <Typography variant="h4" align="center" gutterBottom>
                Download Customer Data
            </Typography>

            <Stack spacing={4}>
                {/* Column Selection */}
                <Accordion defaultExpanded>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="column-selection-content"
                        id="column-selection-header"
                    >
                        <Typography variant="h6">Select Columns to Include In Excel</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormControl component="fieldset" variant="outlined">
                            <FormGroup>
                                <Grid container spacing={2}>
                                    {availableColumns.map((col) => (
                                        <Grid item xs={12} sm={6} md={4} key={col.value}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={selectedColumns.includes(col.value)}
                                                        onChange={() => handleColumnChange(col.value)}
                                                        name={col.value}
                                                        color="primary"
                                                    />
                                                }
                                                label={col.label}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </FormGroup>
                        </FormControl>
                    </AccordionDetails>
                </Accordion>

                <Divider />

                {/* Date Range Filter */}
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="date-range-content"
                        id="date-range-header"
                    >
                        <Typography variant="h6">Date Range Filter</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormControl component="fieldset">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={applyDateFilter}
                                        onChange={(e) => setApplyDateFilter(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Apply Date Range Filter"
                            />
                            {applyDateFilter && (
                                <Box sx={{ marginTop: 2 }}>
                                    <Grid container spacing={2} alignItems="center">
                                        {['today', 'yesterday', 'lastWeek', 'thisMonth', 'custom', 'all'].map((range) => (
                                            <Grid item key={range}>
                                                <Chip
                                                    label={
                                                        range === 'today'
                                                            ? 'Today'
                                                            : range === 'yesterday'
                                                                ? 'Yesterday'
                                                                : range === 'lastWeek'
                                                                    ? 'Last Week'
                                                                    : range === 'thisMonth'
                                                                        ? 'This Month'
                                                                        : range === 'custom'
                                                                            ? 'Custom'
                                                                            : 'All Time'
                                                    }
                                                    clickable
                                                    onClick={() => handleDateRangeChange(range)}
                                                    sx={{
                                                        backgroundColor: dateRange === range ? 'primary.main' : 'grey.300',
                                                        color: dateRange === range ? 'white' : 'black',
                                                        '&:hover': {
                                                            backgroundColor: dateRange === range ? 'primary.dark' : 'grey.400',
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>

                                    {dateRange === 'custom' && (
                                        <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                <DatePicker
                                                    label="Start Date"
                                                    value={customStartDate}
                                                    onChange={(newValue) => setCustomStartDate(newValue)}
                                                    renderInput={(params) => <TextField {...params} size='small' />}
                                                />
                                                <DatePicker
                                                    label="End Date"
                                                    value={customEndDate}
                                                    onChange={(newValue) => setCustomEndDate(newValue)}
                                                    renderInput={(params) => <TextField {...params} size='small' />}
                                                />
                                            </LocalizationProvider>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </FormControl>
                    </AccordionDetails>
                </Accordion>

                {/* Item Filter */}
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="item-filter-content"
                        id="item-filter-header"
                    >
                        <Typography variant="h6">Item Filter</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormControl component="fieldset">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={applyItemFilter}
                                        onChange={(e) => setApplyItemFilter(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Apply Item Filter"
                            />
                            {applyItemFilter && (
                                <Box sx={{ marginTop: 2 }}>
                                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                        {availableItems.map((item) => (
                                            <Chip
                                                key={item}
                                                label={item}
                                                clickable
                                                onClick={() => {
                                                    setItems((prev) =>
                                                        prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                                                    );
                                                }}
                                                sx={{
                                                    backgroundColor: items.includes(item) ? 'primary.light' : 'grey.300',
                                                    color: items.includes(item) ? 'primary.contrastText' : 'black',
                                                    '&:hover': {
                                                        backgroundColor: items.includes(item) ? 'primary.main' : 'grey.400',
                                                        color: items.includes(item) ? 'white' : 'black',
                                                    },
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </FormControl>
                    </AccordionDetails>
                </Accordion>

                {/* Customer Loyalty Filter */}
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="loyalty-filter-content"
                        id="loyalty-filter-header"
                    >
                        <Typography variant="h6">Customer Loyalty Filter</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormControl component="fieldset">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={applyLoyaltyFilter}
                                        onChange={(e) => setApplyLoyaltyFilter(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Apply Customer Loyalty Filter"
                            />
                            {applyLoyaltyFilter && (
                                <Box sx={{ marginTop: 2 }}>
                                    <FormGroup>
                                        {/* Minimum Amount Spent */}
                                        <Box sx={{ marginBottom: 3 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={loyaltyFilters.minAmountSpent.checked}
                                                        onChange={() => handleLoyaltyFilterChange('minAmountSpent')}
                                                        name="minAmountSpent"
                                                        color="primary"
                                                    />
                                                }
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        Minimum Amount Spent
                                                        <Tooltip title="Set the minimum total amount a customer has spent">
                                                            <InfoIcon fontSize="small" color="action" sx={{ marginLeft: 0.5 }} />
                                                        </Tooltip>
                                                    </Box>
                                                }
                                            />
                                            {loyaltyFilters.minAmountSpent.checked && (
                                                <Box sx={{ width: '100%', paddingLeft: 4, marginTop: 1 }}>
                                                    <Slider
                                                        value={loyaltyFilters.minAmountSpent.value}
                                                        onChange={(e, val) => handleLoyaltySliderChange('minAmountSpent', val)}
                                                        aria-labelledby="min-amount-spent-slider"
                                                        valueLabelDisplay="auto"
                                                        min={0}
                                                        max={5000} // Adjust as needed
                                                        step={200}
                                                    />
                                                    <Typography variant="body2" color="textSecondary">
                                                        {`₹${loyaltyFilters.minAmountSpent.value}`}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Minimum Number of Orders */}
                                        <Box sx={{ marginBottom: 3 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={loyaltyFilters.minNumberOfOrders.checked}
                                                        onChange={() => handleLoyaltyFilterChange('minNumberOfOrders')}
                                                        name="minNumberOfOrders"
                                                        color="primary"
                                                    />
                                                }
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        Minimum Number of Orders
                                                        <Tooltip title="Set the minimum number of orders a customer has placed">
                                                            <InfoIcon fontSize="small" color="action" sx={{ marginLeft: 0.5 }} />
                                                        </Tooltip>
                                                    </Box>
                                                }
                                            />
                                            {loyaltyFilters.minNumberOfOrders.checked && (
                                                <Box sx={{ width: '100%', paddingLeft: 4, marginTop: 1 }}>
                                                    <TextField
                                                        type="number"
                                                        variant="outlined"
                                                        size="small"
                                                        value={loyaltyFilters.minNumberOfOrders.value}
                                                        onChange={(e) => handleLoyaltySliderChange('minNumberOfOrders', +e.target.value)}
                                                        InputProps={{
                                                            inputProps: { min: 0, max: 100 },
                                                        }}
                                                    />
                                                    <Typography variant="body2" color="textSecondary">
                                                        {`${loyaltyFilters.minNumberOfOrders.value} Orders`}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Number of Items Count */}
                                        <Box sx={{ marginBottom: 3 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={loyaltyFilters.minItemsCount.checked}
                                                        onChange={() => handleLoyaltyFilterChange('minItemsCount')}
                                                        name="minItemsCount"
                                                        color="primary"
                                                    />
                                                }
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        Minimum Number of Items Purchased
                                                        <Tooltip title="Set the minimum number of items a customer has purchased">
                                                            <InfoIcon fontSize="small" color="action" sx={{ marginLeft: 0.5 }} />
                                                        </Tooltip>
                                                    </Box>
                                                }
                                            />
                                            {loyaltyFilters.minItemsCount.checked && (
                                                <Box sx={{ width: '100%', paddingLeft: 4, marginTop: 1 }}>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        InputProps={{
                                                            inputProps: {
                                                                min: 0,
                                                                max: 1000,
                                                                step: 1,
                                                            },
                                                        }}
                                                        value={loyaltyFilters.minItemsCount.value}
                                                        onChange={(e) => handleLoyaltySliderChange('minItemsCount', Number(e.target.value))}
                                                        label="Minimum Number of Items Purchased"
                                                        variant="outlined"
                                                    />
                                                    <Typography variant="body2" color="textSecondary">
                                                        {`${loyaltyFilters.minItemsCount.value} Items`}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </FormGroup>
                                </Box>
                            )}
                        </FormControl>
                    </AccordionDetails>
                </Accordion>

                {/* Tags Input */}
                {/* <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="tags-input-content"
                        id="tags-input-header"
                    >
                        <Typography variant="h6">Tags</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextField
                            label="Tags"
                            variant="outlined"
                            fullWidth
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Enter tags for the CSV (optional)"
                            helperText="Separate multiple tags with commas"
                        />
                    </AccordionDetails>
                </Accordion> */}

                {/* Download Button */}
                <Box textAlign="center" sx={{ marginTop: 4 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDownloadCSV}
                        size="large"
                        disabled={isDownloading}
                        startIcon={isDownloading && <CircularProgress size={20} color="inherit" />}
                    >
                        {isDownloading ? 'Downloading...' : 'Download CSV'}
                    </Button>
                </Box>
            </Stack>
        </Container>
    );
}

export default DownloadCustomersData;
