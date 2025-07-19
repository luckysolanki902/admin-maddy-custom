'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './styles/DepartmentLinks.module.css';

const DepartmentLinks = () => {
  const [masterAdminVisible, setMasterAdminVisible] = useState(false);

  useEffect(() => {
    const isMasterAdmin = localStorage.getItem('isMasterAdmin');
    if (isMasterAdmin === 'true') {
      setMasterAdminVisible(true);
    }
  }, []);

  const departments = [
    {
      name: 'Marketing',
      href: '/admin/departments/marketing',
      goalsHref: '/admin/departments/marketing-goals',
      style: 'marketingBox',
      color: 'rgb(255, 220, 100)',
      description: 'Campaigns & Analytics'
    },
    {
      name: 'Design',
      href: '/admin/departments/design',
      goalsHref: '/admin/departments/design-goals',
      style: 'designBox',
      color: 'rgb(28, 251, 255)',
      description: 'Creative & Visual'
    },
    {
      name: 'Web-Dev',
      href: '/admin/departments/web-d',
      goalsHref: '/admin/departments/web-d-goals',
      style: 'webdBox',
      color: 'rgb(255, 58, 97)',
      description: 'Development & Tech'
    },
    {
      name: 'Production',
      href: '/admin/departments/production',
      goalsHref: '/admin/departments/production-goals',
      style: 'productionBox',
      color: 'rgb(255, 255, 255)',
      description: 'Manufacturing & QC'
    },
    {
      name: 'Finance',
      href: '/admin/departments/finance',
      goalsHref: '/admin/departments/finance-goals',
      style: 'financeBox',
      color: 'rgb(11, 162, 101)',
      description: 'Accounting & Reports'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Department Access</h2>
        <p className={styles.sectionSubtitle}>Navigate to your department dashboard</p>
      </div>
      
      <div className={styles.grid}>
        {departments.map((dept, index) => (
          <div key={dept.name} className={styles.department}>
            <div className={styles.departmentHeader}>
              <h3 className={styles.departmentName} style={{ color: dept.color }}>
                {dept.name}
              </h3>
              <p className={styles.departmentDesc}>{dept.description}</p>
            </div>
            
            <div className={styles.departmentActions}>
              <Link 
                href={dept.href} 
                className={`${styles.box} ${styles[dept.style]}`}
                style={{
                  '--dept-color': dept.color,
                  '--dept-glow': dept.color.replace('rgb', 'rgba').replace(')', ', 0.3)')
                }}
              >
                <span className={styles.boxLabel}>Dashboard</span>
              </Link>
              
              <Link 
                href={dept.goalsHref} 
                className={`${styles.goals} ${styles[dept.style]}`}
                style={{
                  '--dept-color': dept.color,
                  '--dept-glow': dept.color.replace('rgb', 'rgba').replace(')', ', 0.4)')
                }}
              >
                Goals
              </Link>
            </div>
          </div>
        ))}

        {masterAdminVisible && (
          <div className={styles.department}>
            <div className={styles.departmentHeader}>
              <h3 className={styles.departmentName} style={{ color: 'rgb(255, 100, 100)' }}>
                Master Admin
              </h3>
              <p className={styles.departmentDesc}>System Management</p>
            </div>
            
            <div className={styles.departmentActions}>
              <Link 
                href="/admin/access-management" 
                className={`${styles.box} ${styles.masterAdminBox}`}
                style={{
                  '--dept-color': 'rgb(255, 100, 100)',
                  '--dept-glow': 'rgba(255, 100, 100, 0.3)'
                }}
              >
                <span className={styles.boxLabel}>Access Control</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentLinks;
