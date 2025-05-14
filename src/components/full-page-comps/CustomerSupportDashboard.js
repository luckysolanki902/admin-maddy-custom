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
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolvedByFilter, setResolvedByFilter] = useState('all');
  const [sortOption, setSortOption] = useState('dateDesc');
  const [activeTag, setActiveTag] = useState('last7days');
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(6, 'day').startOf('day').toDate(),
    end: dayjs().endOf('day').toDate(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [supportData, setSupportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSupportData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('department', departmentFilter);
        params.append('category', categoryFilter);
        params.append('subcategory', subcategoryFilter);
        params.append('status', statusFilter);
        params.append('resolvedBy', resolvedByFilter);
        params.append('sort', sortOption);
        params.append('page', currentPage);
        params.append('startDate', dateRange.start ? dateRange.start.toISOString() : '');
        params.append('endDate', dateRange.end ? dateRange.end.toISOString() : '');

        const res = await fetch(`/api/support?${params.toString()}`);
        const data = await res.json();
        setSupportData(data.supportTickets);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Failed to fetch support data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupportData();
  }, [
    departmentFilter,
    categoryFilter,
    subcategoryFilter,
    statusFilter,
    resolvedByFilter,
    sortOption,
    currentPage,
    dateRange,
  ]);

  const handleAllTagClick = () => {
    setActiveTag('all');
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const handleCustomDayChange = (date) => {
    setActiveTag('custom');
    setDateRange({
      start: date.startOf('day').toDate(),
      end: date.endOf('day').toDate(),
    });
    setCurrentPage(1);
  };

  const handleCustomDateChange = (start, end) => {
    setActiveTag('customRange');
    setDateRange({
      start: start.startOf('day').toDate(),
      end: end.endOf('day').toDate(),
    });
    setCurrentPage(1);
  };

  const handleMonthSelection = (tag) => {
    if (tag === 'thisMonth') {
      setActiveTag('thisMonth');
      setDateRange({
        start: dayjs().startOf('month').toDate(),
        end: dayjs().endOf('day').toDate(),
      });
    } else if (tag === 'lastMonth') {
      setActiveTag('lastMonth');
      setDateRange({
        start: dayjs().subtract(1, 'month').startOf('month').toDate(),
        end: dayjs().subtract(1, 'month').endOf('month').toDate(),
      });
    }
    setCurrentPage(1);
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
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          setDateRange={setDateRange}
          setCurrentPage={setCurrentPage}
          handleAllTagClick={handleAllTagClick}
          handleCustomDayChange={handleCustomDayChange}
          handleCustomDateChange={handleCustomDateChange}
          handleMonthSelection={handleMonthSelection}
        />
        {loading ? (
          <Skeleton variant="rectangular" height={400} />
        ) : (
          <SupportList data={supportData} />
        )}
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(event, value) => setCurrentPage(value)}
          sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
        />
      </Paper>
    </Container>
  );
};

export default CustomerSupportDashboard;