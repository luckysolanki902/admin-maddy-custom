import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function WEBD() {
  const optionsWithLinks = [
        { text: 'Orders Dashboard', link: '/admin/super/orders/order-list' },
  ];

  return (
    <DepartmentHomePage
      department="Web-d"
      quote="If you were looking for buttons to click, you're in the right department."
      options={optionsWithLinks}
    />
  );
}
