import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Marketing() {
  const optionsWithLinks = [
    { text: 'Manage Coupons', link: '/admin/manage/coupons' },
    { text: 'Download User Data', link: '/admin/download/download-user-data' },
    { text: 'Orders Dashboard', link: '/admin/manage/orders/order-list' },
    { text: 'Product Based Sales Analysis', link: '/admin/manage/data-analysis/sales/product-based' },
    { text: 'Analytics Dashboard', link: '/admin/analytics' },
    { text: 'Review Manager', link: '/admin/manage/reviews' },

  ];
  

  return (
    <DepartmentHomePage
      department="Marketing"
      quote="Simple, To the point, Bold"
      options={optionsWithLinks}
    />
  );
}
