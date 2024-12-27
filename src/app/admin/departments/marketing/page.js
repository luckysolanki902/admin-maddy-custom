import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Marketing() {
  const optionsWithLinks = [
    { text: 'Manage Coupons', link: '/admin/manage/coupons' },
    { text: 'Download User Data', link: '/admin/download/download-user-data' },
    { text: 'Product Based Sales Analysis', link: '/admin/manage/data-analysis/sales/product-based' },
  ];

  return (
    <DepartmentHomePage
      department="Marketing"
      quote="Simple, To the point, Bold"
      options={optionsWithLinks}
    />
  );
}
