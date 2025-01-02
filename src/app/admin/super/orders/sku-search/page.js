// /app/admin/manage/orders/sku-search/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Container, TextField, Grid, CircularProgress, Typography, Pagination } from '@mui/material';
import debounce from 'lodash.debounce';
import axios from 'axios';
import ProductCard from '@/components/page-sections/sku-search/ProductCard';

const SKUSearchPage = () => {
  const [sku, setSku] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async (skuQuery, pageNumber = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/manage/product/sku-search', {
        params: {
          sku: skuQuery,
          page: pageNumber,
          limit: 30,
        },
      });
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
      setPage(response.data.currentPage);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((skuTerm) => {
      if (skuTerm.trim() !== '') {
        fetchProducts(skuTerm);
      } else {
        setProducts([]);
        setTotalPages(1);
        setPage(1);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(sku);
    // Cleanup debounce on unmount
    return debouncedSearch.cancel;
  }, [sku, debouncedSearch]);

  // Handle pagination change
  const handlePageChange = (event, value) => {
    setPage(value);
    fetchProducts(sku, value);
  };

  return (
    <Container sx={{ paddingY: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        SKU Product Search
      </Typography>
      <TextField
        fullWidth
        label="Search by SKU"
        variant="outlined"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        placeholder="Enter complete or partial SKU"
        sx={{ marginBottom: 4 }}
      />
      {loading ? (
        <Grid container justifyContent="center">
          <CircularProgress />
        </Grid>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : products.length === 0 && sku.trim() !== '' ? (
        <Typography>No products found for SKU {sku}.</Typography>
      ) : (
        <Grid container spacing={4}>
          {products.map((product) => (
            <Grid item key={product._id} xs={12} sm={6} md={4} lg={3}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      )}
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Grid container justifyContent="center" sx={{ marginTop: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Grid>
      )}
    </Container>
  );
};

export default SKUSearchPage;
