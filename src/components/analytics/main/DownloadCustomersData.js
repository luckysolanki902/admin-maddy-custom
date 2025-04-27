'use client';
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormControlLabel,
  Checkbox,
  Slider,
  TextField,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import dayjs from 'dayjs';
import * as FileSaver from 'file-saver';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';

const availableColumns = [
  { label: 'Full Name', value: 'fullName', default: true },
  { label: 'Phone Number', value: 'phoneNumber', default: true },
  { label: 'First Name', value: 'firstName' },
  { label: 'Last Name', value: 'lastName' },
  { label: 'City', value: 'city' },
  { label: 'Item Purchase Counts', value: 'itemPurchaseCounts' },
  { label: 'Total Amount Spent', value: 'totalAmountSpent' },
  { label: 'UTM Source', value: 'utmSource' },
  { label: 'UTM Medium', value: 'utmMedium' },
  { label: 'UTM Campaign', value: 'utmCampaign' },
  { label: 'Specific Category', value: 'specificCategory' },
  { label: 'Order Count', value: 'orderCount' },
];

const availableItems = [
  'Graphic Helmets',
  'Full Bike Wraps',
  'Tank Wraps',
  'Bonnet Wraps',
  'Window Pillar Wraps',
];

export default function DownloadCustomersData() {
  // Date filter
  const [activeTag, setActiveTag] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Columns & tags
  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.filter(c => c.default).map(c => c.value)
  );
  const [tags, setTags] = useState('');

  // Item filter
  const [applyItemFilter, setApplyItemFilter] = useState(false);
  const [items, setItems] = useState([]);

  // Loyalty filter
  const [applyLoyaltyFilter, setApplyLoyaltyFilter] = useState(false);
  const [loyaltyFilters, setLoyaltyFilters] = useState({
    minAmountSpent: { checked: false, value: 0 },
    minNumberOfOrders: { checked: false, value: 0 },
    minItemsCount: { checked: false, value: 0 },
  });

  // Table & download state
  const [customers, setCustomers] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tableLoading, setTableLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ field: '', order: 'asc' });
  const handleSort = (field) => {
    const isAsc = sortConfig.field === field && sortConfig.order === 'asc';
    setSortConfig({ field, order: isAsc ? 'desc' : 'asc' });
  };

  // Whenever filters or sorting change, reset to page 0
  useEffect(() => {
    setPage(0);
  }, [
    activeTag,
    dateRange.start,
    dateRange.end,
    selectedColumns.join(','),
    applyItemFilter,
    items.join(','),
    applyLoyaltyFilter,
    JSON.stringify(loyaltyFilters),
    tags,
    sortConfig.field,
    sortConfig.order,
  ]);

  // Fetch table data
  useEffect(() => {
    async function fetchData() {
      setTableLoading(true);
      try {
        const query = {
          start: dateRange.start,
          end: dateRange.end,
          activeTag,
          columns: selectedColumns,
          tags,
          applyItemFilter,
          items,
          applyLoyaltyFilter,
          loyalty: {
            minAmountSpent: loyaltyFilters.minAmountSpent.checked
              ? loyaltyFilters.minAmountSpent.value
              : null,
            minNumberOfOrders: loyaltyFilters.minNumberOfOrders.checked
              ? loyaltyFilters.minNumberOfOrders.value
              : null,
            minItemsCount: loyaltyFilters.minItemsCount.checked
              ? loyaltyFilters.minItemsCount.value
              : null,
          },
          page: page + 1,
          pageSize: rowsPerPage,
          sortField: sortConfig.field,
          sortOrder: sortConfig.order,
        };

        const res = await fetch(
          `/api/admin/download/fetch-user-data?query=${encodeURIComponent(
            JSON.stringify(query)
          )}`
        );
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalRecords(data.totalRecords || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setTableLoading(false);
      }
    }

    fetchData();
  }, [
    activeTag,
    dateRange.start,
    dateRange.end,
    selectedColumns,
    applyItemFilter,
    items,
    applyLoyaltyFilter,
    loyaltyFilters,
    tags,
    page,
    rowsPerPage,
    sortConfig,
  ]);

  // Download CSV
  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const query = {
        start: dateRange.start,
        end: dateRange.end,
        activeTag,
        columns: selectedColumns,
        tags,
        applyItemFilter,
        items,
        applyLoyaltyFilter,
        loyalty: {
          minAmountSpent: loyaltyFilters.minAmountSpent.checked
            ? loyaltyFilters.minAmountSpent.value
            : null,
          minNumberOfOrders: loyaltyFilters.minNumberOfOrders.checked
            ? loyaltyFilters.minNumberOfOrders.value
            : null,
          minItemsCount: loyaltyFilters.minItemsCount.checked
            ? loyaltyFilters.minItemsCount.value
            : null,
        },
        sortField: sortConfig.field,
        sortOrder: sortConfig.order,
      };

      const res = await fetch(
        `/api/admin/download/download-user-data?query=${encodeURIComponent(
          JSON.stringify(query)
        )}`
      );
      const blob = await res.blob();
      FileSaver.saveAs(blob, 'customers_data.csv');
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Download Customer Data
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stack spacing={3}>
          <DateRangeChips
            activeTag={activeTag}
            hideCustomChips={true}
            setActiveTag={setActiveTag}
            setDateRange={({ start, end }) => setDateRange({ start, end })}
            setCurrentPage={() => setPage(0)}
            setProblematicCurrentPage={() => {}}
            handleAllTagClick={() => {
              setActiveTag('all');
              setDateRange({ start: null, end: null });
            }}
            handleCustomDayChange={() => {}}
            handleCustomDateChange={() => {}}
            handleMonthSelection={(tag) => {
              let start, end;
              if (tag === 'thisMonth') {
                start = dayjs().startOf('month');
                end = dayjs().endOf('month');
              } else {
                start = dayjs().subtract(1, 'month').startOf('month');
                end = dayjs().subtract(1, 'month').endOf('month');
              }
              setActiveTag(tag);
              setDateRange({ start: start.toDate(), end: end.toDate() });
            }}
          />

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Select Columns</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl component="fieldset">
                <Grid container spacing={1}>
                  {availableColumns.map((col) => (
                    <Grid item xs={6} sm={4} md={3} key={col.value}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedColumns.includes(col.value)}
                            onChange={() =>
                              setSelectedColumns((prev) =>
                                prev.includes(col.value)
                                  ? prev.filter((c) => c !== col.value)
                                  : [...prev, col.value]
                              )
                            }
                          />
                        }
                        label={col.label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormControl>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Item Filter</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={applyItemFilter}
                    onChange={(e) => setApplyItemFilter(e.target.checked)}
                  />
                }
                label="Apply Item Filter"
              />
              {applyItemFilter && (
                <Box sx={{ mt: 2 }}>
                  {availableItems.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      clickable
                      onClick={() =>
                        setItems((prev) =>
                          prev.includes(item)
                            ? prev.filter((i) => i !== item)
                            : [...prev, item]
                        )
                      }
                      sx={{
                        m: 0.5,
                        bgcolor: items.includes(item)
                          ? 'primary.main'
                          : 'grey.300',
                        color: items.includes(item) ? 'white' : 'black',
                      }}
                    />
                  ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Customer Loyalty Filter</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={applyLoyaltyFilter}
                    onChange={(e) =>
                      setApplyLoyaltyFilter(e.target.checked)
                    }
                  />
                }
                label="Apply Loyalty Filter"
              />
              {applyLoyaltyFilter && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {['minAmountSpent', 'minNumberOfOrders', 'minItemsCount'].map(
                    (key) => (
                      <Box key={key}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={loyaltyFilters[key].checked}
                              onChange={() =>
                                setLoyaltyFilters((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    checked: !prev[key].checked,
                                  },
                                }))
                              }
                            />
                          }
                          label={
                            key === 'minAmountSpent'
                              ? 'Minimum Amount Spent'
                              : key === 'minNumberOfOrders'
                              ? 'Minimum Number of Orders'
                              : 'Minimum Items Purchased'
                          }
                        />
                        {loyaltyFilters[key].checked && (
                          <Box sx={{ px: 3 }}>
                            {key === 'minAmountSpent' ? (
                              <>
                                <Slider
                                  min={0}
                                  max={20000}
                                  step={500}
                                  value={loyaltyFilters[key].value}
                                  onChange={(e, v) =>
                                    setLoyaltyFilters((prev) => ({
                                      ...prev,
                                      [key]: { ...prev[key], value: v },
                                    }))
                                  }
                                  valueLabelDisplay="auto"
                                />
                                <Typography>
                                  ₹{loyaltyFilters[key].value}
                                </Typography>
                              </>
                            ) : (
                              <TextField
                                type="number"
                                fullWidth
                                value={loyaltyFilters[key].value}
                                onChange={(e) =>
                                  setLoyaltyFilters((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      value: Number(e.target.value),
                                    },
                                  }))
                                }
                                InputProps={{ inputProps: { min: 0 } }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    )
                  )}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Paper>

      <Box textAlign="center" sx={{ mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<FileDownloadIcon />}
          onClick={handleDownloadCSV}
          disabled={isDownloading}
        >
          {isDownloading ? 'Preparing CSV…' : 'Download CSV'}
        </Button>
      </Box>
      <Divider sx={{ mb: 4 }} />

      {tableLoading ? (
        <Box textAlign="center" sx={{ py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={2}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {selectedColumns.map((col) => {
                    const colDef = availableColumns.find(c => c.value === col);
                    return (
                      <TableCell
                        key={col}
                        sortDirection={sortConfig.field === col ? sortConfig.order : false}
                      >
                        <TableSortLabel
                          active={sortConfig.field === col}
                          direction={sortConfig.order}
                          onClick={() => handleSort(col)}
                        >
                          {colDef?.label || col}
                        </TableSortLabel>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length ? (
                  customers.map((row, idx) => (
                    <TableRow key={idx} hover>
                      {selectedColumns.map(col => {
                        const label = availableColumns.find(c => c.value === col)?.label;
                        return (
                          <TableCell key={col}>
                            {row[label] != null ? row[label].toString() : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={selectedColumns.length} align="center">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(+e.target.value);
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Container>
  );
}
