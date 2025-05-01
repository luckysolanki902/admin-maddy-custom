'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Box, Button, Divider, CircularProgress,
  Drawer, IconButton, Stack, TextField,
  Accordion, AccordionSummary, AccordionDetails,
  FormControlLabel, Checkbox, Chip, Slider,
  Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination,
  TableSortLabel, Tabs, Tab
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import * as FileSaver from 'file-saver';
import dayjs from 'dayjs';

export default function DownloadCustomersData() {
  // Mode
  const [mode, setMode] = useState('users');
  const handleModeChange = (_, v) => setMode(v);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => setDrawerOpen(o => !o);

  // Available categories
  const [availableCategories, setAvailableCategories] = useState([]);
  useEffect(() => {
    fetch('/api/admin/get-main/get-all-spec-cat')
      .then(r => r.json())
      .then(d => setAvailableCategories(d.categories || []));
    console.log({ availableCategories });
  }, []);

  // Filters & states
  const [activeTag, setActiveTag] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [tags, setTags] = useState('');
  const [applyItemFilter, setApplyItemFilter] = useState(false);
  const [items, setItems] = useState([]);
  const [applyVehicleFilter, setApplyVehicleFilter] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [applyLoyaltyFilter, setApplyLoyaltyFilter] = useState(false);
  const [loyaltyFilters, setLoyaltyFilters] = useState({
    minAmountSpent: { checked: false, value: 0 },
    minNumberOfOrders: { checked: false, value: 0 },
    minItemsCount: { checked: false, value: 0 },
  });

  // Table & pagination
  const [customers, setCustomers] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ field: '', order: 'asc' });
  const handleSort = f => {
    const asc = sortConfig.field === f && sortConfig.order === 'asc';
    setSortConfig({ field: f, order: asc ? 'desc' : 'asc' });
  };

  // Reset page on filter/sort change
  useEffect(() => setPage(0), [
    mode, activeTag, dateRange.start, dateRange.end,
    applyItemFilter, JSON.stringify(items),
    applyVehicleFilter, JSON.stringify(vehicles),
    applyLoyaltyFilter, JSON.stringify(loyaltyFilters),
    tags, selectedColumns.join(','), sortConfig.field, sortConfig.order
  ]);

  // Fetch data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const query = {
          mode,
          start: dateRange.start, end: dateRange.end, activeTag,
          columns: selectedColumns, tags,
          applyItemFilter, items,
          applyVehicleFilter, vehicles,
          applyLoyaltyFilter,
          loyalty: {
            minAmountSpent: loyaltyFilters.minAmountSpent.checked
              ? loyaltyFilters.minAmountSpent.value : null,
            minNumberOfOrders: loyaltyFilters.minNumberOfOrders.checked
              ? loyaltyFilters.minNumberOfOrders.value : null,
            minItemsCount: loyaltyFilters.minItemsCount.checked
              ? loyaltyFilters.minItemsCount.value : null,
          },
          page: page + 1, pageSize: rowsPerPage,
          sortField: sortConfig.field, sortOrder: sortConfig.order
        };
        const res = await fetch(
          `/api/admin/download/fetch-user-data?query=${encodeURIComponent(JSON.stringify(query))}`
        );
        const json = await res.json();
        setCustomers(json.customers || []);
        setTotalRecords(json.totalRecords || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    mode, activeTag, dateRange, selectedColumns, tags,
    applyItemFilter, items,
    applyVehicleFilter, vehicles,
    applyLoyaltyFilter, loyaltyFilters,
    page, rowsPerPage, sortConfig
  ]);

  // Download CSV
  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const query = {
        mode,
        start: dateRange.start, end: dateRange.end, activeTag,
        columns: selectedColumns, tags,
        applyItemFilter, items,
        applyVehicleFilter, vehicles,
        applyLoyaltyFilter,
        loyalty: {
          minAmountSpent: loyaltyFilters.minAmountSpent.checked
            ? loyaltyFilters.minAmountSpent.value : null,
          minNumberOfOrders: loyaltyFilters.minNumberOfOrders.checked
            ? loyaltyFilters.minNumberOfOrders.value : null,
          minItemsCount: loyaltyFilters.minItemsCount.checked
            ? loyaltyFilters.minItemsCount.value : null,
        },
        sortField: sortConfig.field, sortOrder: sortConfig.order
      };
      const res = await fetch(
        `/api/admin/download/download-user-data?query=${encodeURIComponent(JSON.stringify(query))}`
      );
      const blob = await res.blob();
      FileSaver.saveAs(blob, `${mode === 'orders' ? 'orders' : 'users'}_data.csv`);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  // Column definitions
  const availableColumns = useMemo(() => [
    { label: 'Order ID', value: 'orderId' },
    { label: 'Full Name', value: 'fullName' },
    { label: 'Phone Number', value: 'phoneNumber' },
    { label: 'City', value: 'city' },
    { label: 'Item Purchase Counts', value: 'itemPurchaseCounts' },
    { label: 'Total Amount Spent', value: 'totalAmountSpent' },
    { label: 'UTM Source', value: 'utmSource' },
    { label: 'UTM Medium', value: 'utmMedium' },
    { label: 'UTM Campaign', value: 'utmCampaign' },
    { label: 'Specific Category', value: 'specificCategory' },
    { label: 'Order Count', value: 'orderCount' },
  ], []);

  // Default columns on mode change
  useEffect(() => {
    setSelectedColumns(
      availableColumns
        .filter(c => mode === 'orders'
          ? ['orderId', 'fullName', 'phoneNumber'].includes(c.value)
          : ['fullName', 'phoneNumber', 'orderCount'].includes(c.value))
        .map(c => c.value)
    );
  }, [mode, availableColumns]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {mode === 'orders' ? 'Download Orders Data' : 'Download Users Data'}
      </Typography>

      {/* Mode + Filters + Download */}
      <Box sx={{ display: { xs: 'block', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ mb: { xs: 2, md: 0 } }}>
          <Tabs value={mode} onChange={handleModeChange}>
            <Tab label="Users Mode" value="users" />
            <Tab label="Orders Mode" value="orders" />
          </Tabs>
        </Box>
        <Box>

<Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'inline',
              cursor: 'pointer',
              padding: '0px 8px',
              borderRadius: '8px',
              mr: 1,
              '&:hover': {
                backgroundColor: 'rgba(245, 245, 245, 0.1)',
              },
            }}
            onClick={toggleDrawer}
          >
            Filters
            <IconButton disableRipple><FilterListIcon /></IconButton>
          </Box>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleDownloadCSV}
            disabled={downloading}
          >
            {downloading ? 'Preparing CSV…' : 'Download CSV'}
          </Button>
          </Box>
        </Box>
      </Box>
      <Divider />

      {/* Bottom Drawer with Accordions */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={toggleDrawer}
        PaperProps={{ sx: { borderRadius: '16px 16px 0 0' } }}
      >
        <Box p={2} maxHeight="70vh" overflow="auto" style={{ overflowX: 'hidden' }}>
          <Divider sx={{ width: '20%', maxWidth: 350, borderRadius: 2, mb: 2, mx: 'auto', height: '0.4rem', backgroundColor: 'rgba(200,200,200)', display: { xs: 'block', md: 'none' } }} />
          <Stack spacing={2}>

            {/* Date Range */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Date Range</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <DateRangeChips
                  activeTag={activeTag}
                  hideCustomChips
                  setActiveTag={setActiveTag}
                  setDateRange={({ start, end }) => setDateRange({ start, end })}
                  handleAllTagClick={() => { setActiveTag('all'); setDateRange({ start: null, end: null }); }}
                  handleMonthSelection={tag => {
                    let s, e;
                    if (tag === 'thisMonth') { s = dayjs().startOf('month'); e = dayjs().endOf('month'); }
                    else { s = dayjs().subtract(1, 'month').startOf('month'); e = dayjs().subtract(1, 'month').endOf('month'); }
                    setActiveTag(tag);
                    setDateRange({ start: s.toDate(), end: e.toDate() });
                  }}
                />
              </AccordionDetails>
            </Accordion>

            {/* Columns */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Select Columns</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {availableColumns.map(col => (
                    <Chip
                      key={col.value}
                      label={col.label}
                      clickable
                      color={selectedColumns.includes(col.value) ? 'primary' : 'default'}
                      onClick={() => {
                        setSelectedColumns(prev =>
                          prev.includes(col.value)
                            ? prev.filter(v => v !== col.value)
                            : [...prev, col.value]
                        );
                      }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Search Tag */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Global Search</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  label="Search across name, phone, city, product…"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  fullWidth
                />
              </AccordionDetails>
            </Accordion>

            {/* Category Filter */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Filter by Specific Category</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyItemFilter}
                      onChange={e => setApplyItemFilter(e.target.checked)}
                    />
                  }
                  label="Enable Category Filter"
                />
                {applyItemFilter && (
                  <Box mt={1}>
                    {availableCategories.map(cat => (
                      <Chip
                        key={cat._id}
                        label={cat.name}
                        clickable
                        color={items.includes(cat._id) ? 'primary' : 'default'}
                        onClick={() => setItems(prev =>
                          prev.includes(cat._id)
                            ? prev.filter(x => x !== cat._id)
                            : [...prev, cat._id]
                        )}
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Vehicle Filter */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Filter by Vehicle</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyVehicleFilter}
                      onChange={e => setApplyVehicleFilter(e.target.checked)}
                    />
                  }
                  label="Enable Vehicle Filter"
                />
                {applyVehicleFilter && (
                  <Box>
                    {['bike', 'car'].map(v => (
                      <FormControlLabel
                        key={v}
                        control={
                          <Checkbox
                            checked={vehicles.includes(v)}
                            onChange={() => setVehicles(prev =>
                              prev.includes(v)
                                ? prev.filter(x => x !== v)
                                : [...prev, v]
                            )}
                          />
                        }
                        label={v.charAt(0).toUpperCase() + v.slice(1)}
                      />
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Loyalty Filter */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Customer Loyalty</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyLoyaltyFilter}
                      onChange={e => setApplyLoyaltyFilter(e.target.checked)}
                    />
                  }
                  label="Enable Loyalty Filter"
                />
                {applyLoyaltyFilter && (
                  <Stack spacing={2} mt={1}>
                    {['minAmountSpent', 'minNumberOfOrders', 'minItemsCount'].map(key => (
                      <Box key={key}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={loyaltyFilters[key].checked}
                              onChange={() => setLoyaltyFilters(prev => ({
                                ...prev,
                                [key]: { ...prev[key], checked: !prev[key].checked }
                              }))}
                            />
                          }
                          label={{
                            minAmountSpent: 'Min Amount Spent',
                            minNumberOfOrders: 'Min # of Orders',
                            minItemsCount: 'Min Items Purchased'
                          }[key]}
                        />
                        {loyaltyFilters[key].checked && (
                          key === 'minAmountSpent' ? (
                            <>
                              <Slider
                                min={0} max={20000} step={500}
                                value={loyaltyFilters[key].value}
                                onChange={(e, v) => setLoyaltyFilters(prev => ({
                                  ...prev, [key]: { ...prev[key], value: v }
                                }))}
                                valueLabelDisplay="auto"
                              />
                              <Typography>₹{loyaltyFilters[key].value}</Typography>
                            </>
                          ) : (
                            <TextField
                              type="number" fullWidth
                              value={loyaltyFilters[key].value}
                              onChange={e => setLoyaltyFilters(prev => ({
                                ...prev, [key]: { ...prev[key], value: +e.target.value }
                              }))}
                              inputProps={{ min: 0 }}
                            />
                          )
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

          </Stack>
        </Box>
      </Drawer>

      {/* Data Table */}
      {loading ? (
        <Box textAlign="center" py={10}><CircularProgress /></Box>
      ) : (
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {mode === 'orders' && <TableCell>Order ID</TableCell>}
                {selectedColumns.map(col => {
                  if (mode === 'orders' && col === 'orderId') return null;
                  const label = availableColumns.find(c => c.value === col)?.label;
                  return (
                    <TableCell key={col} sortDirection={sortConfig.field === col ? sortConfig.order : false}>
                      <TableSortLabel
                        active={sortConfig.field === col}
                        direction={sortConfig.order}
                        onClick={() => handleSort(col)}
                      >
                        {label}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.length ? customers.map((row, i) => (
                <TableRow key={i}>
                  {mode === 'orders' && <TableCell>{row['Order ID'] || row.orderId}</TableCell>}
                  {selectedColumns.map(col => {
                    if (mode === 'orders' && col === 'orderId') return null;
                    const val = row[availableColumns.find(c => c.value === col)?.label] || row[col];
                    return <TableCell key={col}>{val != null ? val.toString() : '—'}</TableCell>;
                  })}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={selectedColumns.length + (mode === 'orders' ? 1 : 0)} align="center">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_, n) => setPage(n)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </TableContainer>
      )}
    </Container>
  );
}
