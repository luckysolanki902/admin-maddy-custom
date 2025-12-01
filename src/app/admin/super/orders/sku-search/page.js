'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, TextField, Grid, Typography, Pagination, Chip, Box } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';

import debounce from 'lodash.debounce';
import axios from 'axios';
import ProductCard from '@/components/page-sections/sku-search/ProductCard';

const CACHE_MS = 1000 * 60 * 2; // 2 minutes client cache

const SKUSearchPage = () => {
  const [sku, setSku] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exactMatch, setExactMatch] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Simple in-memory client cache across navigations (lives while page remains mounted)
  const cacheRef = useRef(new Map()); // key -> { timestamp, data, etag }

  const fetchProducts = useCallback(async (skuQuery, pageNumber = 1, isExactMatch = false) => {
    if (!skuQuery.trim()) {
      setProducts([]);
      setTotalPages(1);
      setPage(1);
      return;
    }
    const key = JSON.stringify({ skuQuery, pageNumber, isExactMatch });
    const now = Date.now();
    const cached = cacheRef.current.get(key);
    if (cached && now - cached.timestamp < CACHE_MS) {
      setProducts(cached.data.products);
      setTotalPages(cached.data.totalPages);
      setPage(cached.data.currentPage);
      return; // serve from cache without loading state flash
    }
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (cached?.etag) headers['If-None-Match'] = cached.etag;
      const response = await axios.get('/api/admin/manage/product/sku-search', {
        params: { sku: skuQuery, page: pageNumber, limit: 30, exactMatch: isExactMatch },
        headers,
        validateStatus: status => (status >= 200 && status < 300) || status === 304,
      });
      if (response.status === 304 && cached) {
        // Not modified, reuse cache
        setProducts(cached.data.products);
        setTotalPages(cached.data.totalPages);
        setPage(cached.data.currentPage);
        return;
      }
      const etag = response.headers['etag'];
      const data = response.data;
      setProducts(data.products);
      setTotalPages(data.totalPages);
      setPage(data.currentPage);
      cacheRef.current.set(key, { timestamp: now, data, etag });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search function
  // Wrap fetch in a stable debounced function; recreate only if fetchProducts changes
  useEffect(() => {
    const handler = debounce((term, isExactMatch) => {
      if (term.trim()) {
        fetchProducts(term, 1, isExactMatch);
      } else {
        setProducts([]);
        setTotalPages(1);
        setPage(1);
      }
    }, 400);
    handler(sku, exactMatch);
    return () => handler.cancel();
  }, [sku, exactMatch, fetchProducts]);

  // Handle pagination change
  const handlePageChange = (event, value) => {
    setPage(value);
    fetchProducts(sku, value, exactMatch);
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
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 4 }}>
        <TextField
          fullWidth
          label="Search by SKU"
          variant="outlined"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Force immediate fetch bypassing debounce
              fetchProducts(sku, 1, exactMatch);
            }
          }}
          placeholder={exactMatch ? "Enter exact SKU" : "Enter complete or partial SKU"}
        />
        <Chip
          label="Exact Match"
          color={exactMatch ? 'primary' : 'default'}
          variant={exactMatch ? 'filled' : 'outlined'}
          onClick={() => setExactMatch(!exactMatch)}
          sx={{ minWidth: 110, cursor: 'pointer' }}
        />
      </Box>
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
