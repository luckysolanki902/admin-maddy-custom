// /pages/admin/analytics/abandoned-carts/index.js
"use client"
import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControl,
    FormControlLabel,
    Checkbox,
    FormGroup,
    Grid,
    Chip,
    Box,
    Button,
    CircularProgress,
    TextField,
    Slider,
    Tooltip,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import * as FileSaver from 'file-saver';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';

const AbandonedCartsData = () => {

    const [applyDateFilter, setApplyDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState({ 
        start: null, 
        end: null 
    });
    const [activeTag, setActiveTag] = useState('all');

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
        { label: 'City', value: 'city' },
        // { label: 'Purchase Count', value: 'purchaseCount' },
        { label: 'Item Purchase Counts', value: 'itemPurchaseCounts' },
        { label: 'Total Amount Spent', value: 'totalAmountSpent' },
        { label: 'UTM Source', value: 'utmSource' },
        { label: 'UTM Medium', value: 'utmMedium' },
        { label: 'UTM Campaign', value: 'utmCampaign' },
        { label: 'Specific Category', value: 'specificCategory' },
        { label: 'Order Count', value: 'orderCount' },
        { label: 'Funnel Stage', value: 'funnelStage', default: true },
        { label: 'Last Activity', value: 'lastActivityAt' }
        // 'Order Count' is not applicable here as all users have zero successful orders
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
    
    const handleAllTagClick = () => {
        setActiveTag('all');
        setDateRange({ start: null, end: null });
    };

    const handleCustomDayChange = (date) => {
        setActiveTag('custom');
        setDateRange({ 
            start: date.startOf('day').toDate(),
            end: date.endOf('day').toDate() 
        });
    };
    
    const handleCustomDateChange = (start, end) => {
        setActiveTag('customRange');
        setDateRange({ 
            start: start.startOf('day').toDate(),
            end: end.endOf('day').toDate() 
        });
    };
    
    const handleMonthSelection = (tag) => {
        if (tag === 'thisMonth') {
            setDateRange({
                start: dayjs().startOf('month').toDate(),
                end: dayjs().endOf('month').toDate()
            });
        } else if (tag === 'lastMonth') {
            setDateRange({
                start: dayjs().subtract(1, 'month').startOf('month').toDate(),
                end: dayjs().subtract(1, 'month').endOf('month').toDate()
            });
        }
        setActiveTag(tag);
    };

    // Table States
    const [customers, setCustomers] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1); // 1-based page index for API
    const [pageSize, setPageSize] = useState(10);
    const [tableLoading, setTableLoading] = useState(false);

    // Download State
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch Table Data
    const fetchTableData = async () => {
        setTableLoading(true);
        try {
            const query = {};

            // Payment Status is implicitly handled in the backend (only users with no successful orders are fetched)

            // Apply Date Filter
            if (applyDateFilter && dateRange.start && dateRange.end) {
                query.createdAt = {
                    $gte: dateRange.start,
                    $lte: dateRange.end,
                };
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

            query.specialFilter = 'abandonedCart';

            // Tags
            if (tags.trim() !== '') {
                query.tags = tags.trim();
            }

            // Pagination
            query.page = page;
            query.pageSize = pageSize;

            // Serialize the query object to a JSON string
            const serializedQuery = JSON.stringify(query);

            // Fetch the data from the new API endpoint
            const res = await fetch(`/api/admin/analytics/main/abandoned-carts-user?query=${encodeURIComponent(serializedQuery)}`);
            if (!res.ok) {
                const errorData = await res.json();
                console.error('Error fetching abandoned carts data:', errorData.message);
                alert(`Error fetching data: ${errorData.message}`);
                setTableLoading(false);
                return;
            }
            const data = await res.json();
            setCustomers(data.customers);
            setTotalRecords(data.totalRecords);
        } catch (error) {
            console.error('Error fetching abandoned carts data:', error);
            alert(`Error fetching data: ${error.message}`);
        } finally {
            setTableLoading(false);
        }
    };

    // Fetch table data on mount and when dependencies change
    useEffect(() => {
        fetchTableData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedColumns, dateRange, applyItemFilter, items, applyLoyaltyFilter, loyaltyFilters, page, pageSize, tags]);

    // Handle page change
    const handleChangePage = (event, newPage) => {
        setPage(newPage + 1); // MUI's TablePagination is zero-based
    };

    // Handle page size change
    const handleChangePageSize = (event) => {
        setPageSize(parseInt(event.target.value, 10));
        setPage(1); // Reset to first page when page size changes
    };

    // Handle Download CSV
    const handleDownloadCSV = async () => {
        const query = {};

        if (applyDateFilter && dateRange.start && dateRange.end) {
            query.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
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

    query.specialFilter = 'abandonedCart';

        // Tags
        if (tags.trim() !== '') {
            query.tags = tags.trim();
        }

        try {
            setIsDownloading(true);
            // Serialize the query object to a JSON string
            const serializedQuery = JSON.stringify(query);

            // Fetch the CSV from the API
            const res = await fetch(`/api/admin/download/download-abandoned-carts-user?query=${encodeURIComponent(serializedQuery)}`);
            if (!res.ok) {
                const errorData = await res.json();
                console.error('Error:', errorData.message);
                alert(`Error: ${errorData.message}`);
                setIsDownloading(false);
                return;
            }
            const blob = await res.blob(); // Expecting a CSV blob
            FileSaver.saveAs(blob, 'abandoned_carts_users.csv');
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
                Abandoned Carts Users
            </Typography>

            <Stack spacing={4}>
                {/* Column Selection */}
                <Accordion defaultExpanded>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="column-selection-content"
                        id="column-selection-header"
                    >
                        <Typography variant="h6">Select Columns to Include In CSV</Typography>
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
                                    <DateRangeChips
                                        activeTag={activeTag}
                                        setActiveTag={setActiveTag}
                                        setDateRange={setDateRange}
                                        handleAllTagClick={handleAllTagClick}
                                        handleCustomDayChange={handleCustomDayChange}
                                        handleCustomDateChange={handleCustomDateChange}
                                        handleMonthSelection={handleMonthSelection}
                                    />
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
                                                    backgroundColor: items.includes(item) ? 'success.dark' : 'grey.300',
                                                    color: items.includes(item) ? 'white' : 'black',
                                                    '&:hover': {
                                                        backgroundColor: items.includes(item) ? 'success.main' : 'grey.400',
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

                {/* Divider before the table */}
                <Divider sx={{ marginY: 4 }} />

                {/* Customers Data Table */}
                <Box>
                    <Typography variant="h5" gutterBottom>
                        Abandoned Carts Users Data
                    </Typography>

                    {/* Table Loading Indicator */}
                    {tableLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                            <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
                                <Table stickyHeader aria-label="abandoned carts users table">
                                    <TableHead>
                                        <TableRow>
                                            {selectedColumns.map((col) => (
                                                <TableCell key={col} sx={{ minWidth: 150 }}>
                                                    {availableColumns.find(c => c.value === col)?.label || col}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {customers.map((customer, index) => (
                                            <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                                                {selectedColumns.map((col) => {
                                                    const columnMeta = availableColumns.find((ele) => ele.value === col);
                                                    const label = columnMeta?.label;
                                                    let value = label ? customer[label] : customer[col];

                                                    if (col === 'lastActivityAt' && value) {
                                                        value = dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD HH:mm') : value;
                                                    }

                                                    return (
                                                        <TableCell key={col}>
                                                            {value !== undefined && value !== null ? value.toString() : ' - '}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                        {customers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={selectedColumns.length} align="center">
                                                    No abandoned carts users found with the selected criteria.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Pagination Controls */}
                            <TablePagination
                                component="div"
                                count={totalRecords}
                                page={page - 1} // MUI's TablePagination is zero-based
                                onPageChange={handleChangePage}
                                rowsPerPage={pageSize}
                                onRowsPerPageChange={handleChangePageSize}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                labelRowsPerPage="Records per page"
                            />
                        </Paper>
                    )}
                </Box>
            </Stack>
        </Container>
    );

    
};
export default AbandonedCartsData;
