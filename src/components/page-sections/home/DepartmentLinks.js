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

  return (
    <div className={styles.grid}>
      <div className={styles.department}>
        <Link href="/admin/departments/marketing" className={`${styles.box} ${styles.marketingBox}`}>
          Marketing
        </Link>
        <Link href="/admin/departments/marketing-goals" className={`${styles.goals} ${styles.marketingBox}`}>
          Goals
        </Link>
      </div>

      <div className={styles.department}>
        <Link href="/admin/departments/design" className={`${styles.box} ${styles.designBox}`}>
          Design
        </Link>
        <Link href="/admin/departments/design-goals" className={`${styles.goals} ${styles.designBox}`}>
          Goals
        </Link>
      </div>

      <div className={styles.department}>
        <Link href="/admin/departments/web-d" className={`${styles.box} ${styles.webdBox}`}>
          Web-Dev
        </Link>
        <Link href="/admin/departments/web-d-goals" className={`${styles.goals} ${styles.webdBox}`}>
          Goals
        </Link>
      </div>

      <div className={styles.department}>
        <Link href="/admin/departments/production" className={`${styles.box} ${styles.productionBox}`}>
          Production
        </Link>
        <Link href="/admin/departments/production-goals" className={`${styles.goals} ${styles.productionBox}`}>
          Goals
        </Link>
      </div>
      <div className={styles.department}>
        <Link href="/admin/departments/finance" className={`${styles.box} ${styles.productionBox}`}>
          Finance
        </Link>
        <Link href="/admin/departments/finance-goals" className={`${styles.goals} ${styles.productionBox}`}>
          Goals
        </Link>
      </div>

      {masterAdminVisible && (
        <Link href="/admin/access-management" className={styles.box}>
          Master Admin
        </Link>
      )}
    </div>
  );
};

export default DepartmentLinks;
