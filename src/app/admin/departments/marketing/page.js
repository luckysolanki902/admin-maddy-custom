import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Marketing() {
  const optionsWithLinks = [
    { text: 'Feature Requests Dashboard', link: '/admin/feature-requests/manage' },

    { text: 'Coupon Metrics', link: '/admin/manage/coupons-metrics' },
    { text: 'Offer Management', link: '/admin/manage/offers' },
    { text: 'Orders Dashboard', link: '/admin/manage/orders/order-list' },
    { text: 'Product Based Sales Analysis', link: '/admin/manage/data-analysis/sales/product-based' },
    { text: 'Analytics Dashboard', link: '/admin/analytics' },
    { text: 'ProductInfo Tabs', link: '/admin/manage/product-info' },
    { text: 'Review Manager', link: '/admin/manage/reviews' },
    { text: 'Download Customer Data', link: '/admin/download/download-customer-data' },
    { text: 'Manage Customer Queries', link: '/admin/manage/customer-support' },
  ];


  return (
    <DepartmentHomePage
      department="Marketing"
      quote="Simple, To the point, Bold"
      options={optionsWithLinks}
    />
  );
}
