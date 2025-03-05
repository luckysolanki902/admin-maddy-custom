"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
} from "@mui/material";
import Papa from "papaparse";

export default function InventoryBulkUpdate() {
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resultDetails, setResultDetails] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Handle file selection
  const handleCSVChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // Parse CSV using PapaParse
  // Assumes the CSV has headers: sku, availableQuantity, reorderLevel
  const handleParseCSV = () => {
    if (!csvFile) return;
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setPreviewOpen(true);
      },
      error: (err) => {
        setErrorMsg("Error parsing CSV: " + err.message);
      },
    });
  };

  // Process CSV data and send updates to the API
  const handleUpload = async () => {
    if (!csvData || csvData.length === 0) {
      setErrorMsg("No CSV data to process.");
      return;
    }
    setUploading(true);
    setErrorMsg("");

    // Prepare updates: convert availableQuantity and reorderLevel to numbers
    const updates = csvData.map((row) => ({
      sku: row.sku ? row.sku.trim() : "",
      availableQuantity: row.availableQuantity
        ? parseInt(row.availableQuantity)
        : 0,
      reorderLevel:
        row.reorderLevel && row.reorderLevel.trim() !== ""
          ? parseInt(row.reorderLevel)
          : null,
    }));

    try {
      const res = await fetch("/api/admin/manage/update-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        const result = await res.json();
        setSummary(result.summary);
        setResultDetails(result.details || []);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Bulk update failed.");
      }
    } catch (err) {
      setErrorMsg("Error during bulk update: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Generate headers for preview (based on CSV keys)
  const dynamicHeaders =
    csvData && csvData.length > 0 ? Object.keys(csvData[0]) : [];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Inventory Update
      </Typography>
      {errorMsg && (
        <Typography color="error" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
          {errorMsg}
        </Typography>
      )}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" component="label">
          Select CSV File
          <input type="file" accept=".csv" hidden onChange={handleCSVChange} />
        </Button>
      </Box>
      {csvFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">Selected CSV: {csvFile.name}</Typography>
        </Box>
      )}
      {csvFile && (
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={handleParseCSV}>
            Parse CSV & Preview
          </Button>
        </Box>
      )}

      {/* CSV Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>CSV Data Preview</DialogTitle>
        <DialogContent dividers>
          {csvData.length > 0 ? (
            <Paper sx={{ maxHeight: 400, overflowY: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    {dynamicHeaders.map((header, idx) => (
                      <TableCell key={idx}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      {dynamicHeaders.map((header, colIdx) => (
                        <TableCell key={colIdx}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Typography>No data found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {csvData.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Updating..." : "Process & Update Inventory"}
          </Button>
          {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Box>
      )}

      {/* Detailed Results Table with Pagination */}
      {resultDetails && resultDetails.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Update Results</Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultDetails
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{result.sku}</TableCell>
                      <TableCell>{result.status}</TableCell>
                      <TableCell>{result.message}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={resultDetails.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Box>
      )}

      {/* Summary Section */}
      {summary && (!resultDetails || resultDetails.length === 0) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Update Summary</Typography>
          <Typography>Rows Processed: {summary.processed || 0}</Typography>
        </Box>
      )}
    </Box>
  );
}
