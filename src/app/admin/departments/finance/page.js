import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Finance() {
  const optionsWithLinks = [
    { text: 'Orders Dashboard', link: '/admin/super/orders/order-list' },
  ];


  return (
    <DepartmentHomePage
      department="Finance"
      quote="Simple, To the point, Bold"
      options={optionsWithLinks}
    />
  );
}
