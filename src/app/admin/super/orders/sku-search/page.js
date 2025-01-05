'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Container, TextField, Grid, Typography, Pagination, Box } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';

import debounce from 'lodash.debounce';
import axios from 'axios';
import ProductCard from '@/components/admin/manage/orders/sku-search/ProductCard';

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

  // Generate skeletons based on expected number of products
  const renderSkeletons = () => {
    const skeletonArray = Array.from(new Array(12));
    return skeletonArray.map((_, index) => (
      <Grid item key={index} xs={12} sm={6} md={4} lg={3}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="circular" width={40} height={40} />
      </Grid>
    ));
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
      {error && (
        <Typography color="error" sx={{ marginBottom: 2 }}>
          {error}
        </Typography>
      )}
      {loading ? (
        <Grid container spacing={4}>
          {renderSkeletons()}
        </Grid>
      ) : products.length === 0 && sku.trim() !== '' ? (
        <Typography>{`No products found for SKU ${sku}`}.</Typography>
      ) : (
        <>
          <Grid container spacing={4}>
            {products.map((product) => (
              <Grid item key={product._id} xs={12} sm={6} md={4} lg={3}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
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
        </>
      )}
    </Container>
  );
};

export default SKUSearchPage;
