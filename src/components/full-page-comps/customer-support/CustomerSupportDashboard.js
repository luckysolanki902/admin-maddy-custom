'use client';
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Skeleton,
  Grid,
  Paper,
  Pagination,
} from '@mui/material';
import FilterTags from '@/components/page-sections/customer-support/FilterTags';
import SortOptions from '@/components/page-sections/customer-support/SortOptions';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import SupportList from '@/components/page-sections/customer-support/SupportList';
import CategoryFilter from '@/components/page-sections/customer-support/CategoryFilter';
import SubcategoryFilter from '@/components/page-sections/customer-support/SubcategoryFilter';
import StatusFilter from '@/components/page-sections/customer-support/StatusFilter';
import ResolvedByFilter from '@/components/page-sections/customer-support/ResolvedByFilter';
import dayjs from 'dayjs';

const CustomerSupportDashboard = () => {
  const [supportData, setSupportData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolvedByFilter, setResolvedByFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');

  // Date range states for DateRangeChips
  const [activeDateTag, setActiveDateTag] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  const fetchSupportData = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/customer-support?`;
      if (departmentFilter !== 'all') {
        url += `department=${departmentFilter}&`;
      }
      if (categoryFilter !== 'all') {
        url += `category=${categoryFilter}&`;
      }
      if (subcategoryFilter !== 'all') {
        url += `subcategory=${subcategoryFilter}&`;
      }
      if (statusFilter !== 'all') {
        url += `status=${statusFilter}&`;
      }
      if (resolvedByFilter !== 'all') {
        url += `resolvedBy=${resolvedByFilter}&`;
      }
      if (dateRange.start && dateRange.end) {
        url += `start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}&`;
      }
      url += `page=${currentPage}&limit=${limit}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        let sortedData = json.data;
        if (sortOption === 'oldest') {
          sortedData = sortedData.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortOption === 'status') {
          sortedData = sortedData.slice().sort((a, b) => a.status.localeCompare(b.status));
        } else {
          sortedData = sortedData.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        setSupportData(sortedData);
        if (json.pagination) {
          setTotalPages(json.pagination.pages);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch & when dependencies change
  useEffect(() => {
    fetchSupportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    departmentFilter,
    categoryFilter,
    subcategoryFilter,
    statusFilter,
    resolvedByFilter,
    dateRange,
    sortOption,
    currentPage,
  ]);

  // Update local state for a single support item instead of full re-fetch
  const handleUpdateSupport = async (id, update) => {
    try {
      const res = await fetch(`/api/admin/customer-support?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const json = await res.json();
      if (json.success) {
        setSupportData((prevData) => {
          let newData = prevData.map(item => item._id === id ? json.data : item);
          if (sortOption === 'oldest') {
            newData = newData.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          } else if (sortOption === 'status') {
            newData = newData.slice().sort((a, b) => a.status.localeCompare(b.status));
          } else {
            newData = newData.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          return newData;
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAllTagClick = () => {
    setActiveDateTag('all');
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const handleMonthSelection = (tag) => {
    setActiveDateTag(tag);
    if (tag === 'thisMonth') {
      setDateRange({
        start: dayjs().startOf('month').toDate(),
        end: dayjs().endOf('month').toDate(),
      });
    } else if (tag === 'lastMonth') {
      setDateRange({
        start: dayjs().subtract(1, 'month').startOf('month').toDate(),
        end: dayjs().subtract(1, 'month').endOf('month').toDate(),
      });
    }
    setCurrentPage(1);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Customer Support Dashboard
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 5, mb: 2 }}>
          <FilterTags selected={departmentFilter} onSelect={setDepartmentFilter} />
          <CategoryFilter
            selectedCategory={categoryFilter}
            onSelectCategory={(cat) => {
              setCategoryFilter(cat);
              setSubcategoryFilter('all');
            }}
          />
          <SubcategoryFilter
            selectedCategory={categoryFilter}
            selectedSubcategory={subcategoryFilter}
            onSelectSubcategory={setSubcategoryFilter}
          />
          <StatusFilter
            selectedStatus={statusFilter}
            onSelectStatus={setStatusFilter}
          />
          <ResolvedByFilter
            selectedResolvedBy={resolvedByFilter}
            onSelectResolvedBy={setResolvedByFilter}
          />
          <SortOptions sortOption={sortOption} setSortOption={setSortOption} />
        </Box>
        <DateRangeChips
          activeTag={activeDateTag}
          setActiveTag={setActiveDateTag}
          setDateRange={setDateRange}
          setCurrentPage={setCurrentPage}
          setProblematicCurrentPage={() => {}}
          handleAllTagClick={handleAllTagClick}
        />
        {loading ? (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {Array.from(new Array(5)).map((_, index) => (
              <Grid item xs={12} key={index}>
                <Skeleton variant="rectangular" height={100} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <SupportList supports={supportData} onUpdate={handleUpdateSupport} />
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default CustomerSupportDashboard;
