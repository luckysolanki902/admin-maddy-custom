import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Design() {
  const optionsWithLinks = [
    { text: 'Add designs', link: '/admin/manage/products/add' },
    { text: 'Edit designs', link: '/admin/manage/products/edit' },
    { text: 'Orders List', link: '/admin/manage/orders/order-list' },
    { text: 'Product Based Sales Analysis', link: '/admin/manage/data-analysis/sales/product-based' },
    { text: 'Design Search', link: '/admin/manage/orders/sku-search' },
    { text: 'Review Manager', link: '/admin/manage/reviews' },

  ];

  return (
    <DepartmentHomePage
      department="Design"
      quote="Design is not just how it looks, it is also how it works"
      options={optionsWithLinks}
    />
  );
}
