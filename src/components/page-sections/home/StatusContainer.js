'use client';
import React, { useState, useEffect } from 'react';
import Target from '@/components/page-sections/home/Target';
import styles from './styles/StatusContainer.module.css';

const StatusContainer = () => {
  const [cacData, setCacData] = useState(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState(null);
  const [lateCount, setLateCount] = useState(0);
  const [isThresholdExceeded, setIsThresholdExceeded] = useState(false);
  const [returningPayingUsersData, setReturningPayingUsersData] = useState(null);
  const [userRetentionData, setUserRetentionData] = useState(null);

  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  const startDate = oneWeekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  const currentMonth = today.toISOString().slice(0, 7);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [
          cacResponse,
          revenueResponse,
          lateCountResponse,
          returningPayingUsersResponse,
        ] = await Promise.all([
          fetch('/api/admin/department-targets/cac_market'),
          fetch('/api/admin/department-targets/monthly-revenue'),
          fetch(`/api/admin/department-targets/production/track-shipment-delays?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/admin/department-targets/monthly-paying-users?month=${currentMonth}`)
        ]);

        const cacJson = await cacResponse.json();
        const revenueJson = await revenueResponse.json();
        const lateCountJson = await lateCountResponse.json();
        const returningPayingUsersJson = await returningPayingUsersResponse.json();

        setCacData(cacJson);
        setMonthlyRevenueData(revenueJson);
        setLateCount(lateCountJson.lateCount);
        setIsThresholdExceeded(lateCountJson.isThresholdExceeded);

        const returingusers = returningPayingUsersJson.totalPayingUsersCount;
        setReturningPayingUsersData(returingusers);

        const totalPayingUsersCount = returningPayingUsersJson.totalPayingUsersCount;
        setUserRetentionData((returingusers / totalPayingUsersCount) * 100);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
    }
    fetchAnalytics();
  }, []);

  // Compute metric colors based on fetched values.
  const cacValue = cacData?.cac;
  const cacColor = cacValue !== undefined ? (cacValue < 100 ? 'red' : 'green') : 'gray';
  const customerRetentionColor =
    userRetentionData !== undefined ? (userRetentionData < 20 ? 'red' : 'green') : 'gray';
  const overallColor = (cacColor === 'green' && customerRetentionColor === 'green') ? 'green' : 'red';

  const lateCountColor = isThresholdExceeded ? 'red' : 'green';
  const productColor = 'green';
  const overallColor2 = (lateCountColor === 'green' && productColor === 'green') ? 'green' : 'red';

  const instapostColor = 'green';
  const overallColor3 = (instapostColor === 'green' && productColor === 'green') ? 'green' : 'red';

  return (
    <div className={styles.statusContainer}>
      <div className={`${styles.statusBox} ${overallColor === 'green' ? styles.statusGreen : styles.statusRed}`}>
        <h2 className={styles.statusTitle}>Marketing</h2>
        <div className={styles.metrics}>
          <div>
            <p>Customer retention</p>
            <p>CAC</p>
          </div>
          <div>
            <p>20%/month</p>
            <p>100/week</p>
          </div>
        </div>
      </div>

      {/* The Target component displays revenue info and target timer */}
      {/* <Target targetValue={10000} /> */}

      <div className={`${styles.statusBox} ${overallColor2 === 'green' ? styles.statusGreen : styles.statusRed}`}>
        <h2 className={styles.statusTitle}>Production</h2>
        <div className={styles.metrics}>
          <div>
            <p>Shipment delays</p>
            <p>Product</p>
          </div>
          <div>
            <p>{lateCount}/3days</p>
            <p>2/month</p>
          </div>
        </div>
      </div>

      <div className={`${styles.statusBox} ${overallColor3 === 'green' ? styles.statusGreen : styles.statusRed}`}>
        <h2 className={styles.statusTitle}>Design</h2>
        <div className={styles.metrics}>
          <div>
            <p>Insta Post</p>
            <p>Product</p>
          </div>
          <div>
            <p>5/day</p>
            <p>2/month</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusContainer;
