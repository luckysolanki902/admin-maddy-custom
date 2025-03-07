'use client';
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import styles from './page.module.css';
import NotSignedIn from "@/components/full-page-comps/NotSignedIn";

dayjs.extend(isoWeek);

export default function Home() {
  const searchParams = useSearchParams();
  const [clickSequence, setClickSequence] = useState([]);
  const [textFieldVisible, setTextFieldVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [masterAdminVisible, setMasterAdminVisible] = useState(true);
  const [cacData, setCacData] = useState(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState(null);
  const [lateCount, setLateCount] = useState(0);
  const [isThresholdExceeded, setIsThresholdExceeded] = useState(false);
  const [returningPayingUsersData, setReturningPayingUsersData] = useState(null);
  const [userretentionData, setUserretentionData] = useState(null);

  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  const startDate = oneWeekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  const currentMonth = today.toISOString().slice(0, 7);
  console.log(currentMonth, "currentMonth");

  const correctSequence = ["Love", "Your", "Work"];
  const masterAdminPassword = process.env.NEXT_PUBLIC_MASTER_ADMIN_PASS;

  useEffect(() => {
    const isMasterAdmin = localStorage.getItem('isMasterAdmin');
    if (isMasterAdmin === 'true') {
      setMasterAdminVisible(true);
    }
  }, []);

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
        setUserretentionData((returingusers / totalPayingUsersCount) * 100);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
    }
    fetchAnalytics();
  }, []);

  // Compute metric values and status colors
  const cacValue = cacData?.cac;
  const revenueValue = monthlyRevenueData?.monthlyRevenue;
  const cacColor = cacValue !== undefined ? (cacValue < 100 ? 'red' : 'green') : 'gray';
  const customerRetentionColor =
    userretentionData !== undefined ? (userretentionData < 20 ? 'red' : 'green') : 'gray';
  const instapostColor = 'green';
  const overallColor =
    cacColor === 'green' && customerRetentionColor === 'green' ? 'green' : 'red';

  const lateCountColor = isThresholdExceeded ? 'red' : 'green';
  const productColor = 'green';
  const overallColor2 =
    lateCountColor === 'green' && productColor === 'green' ? 'green' : 'red';
  const overallColor3 =
    instapostColor === 'green' && productColor === 'green' ? 'green' : 'red';

  const handleHeadingClick = (word) => {
    setClickSequence((prevSequence) => {
      const newSequence = [...prevSequence, word];
      if (newSequence.length <= correctSequence.length) {
        const isMatch = newSequence.every((val, index) => val === correctSequence[index]);
        if (isMatch && newSequence.length === correctSequence.length && !masterAdminVisible) {
          setTextFieldVisible(true);
        }
      } else {
        return [];
      }
      return newSequence;
    });
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (inputValue === masterAdminPassword) {
        setMasterAdminVisible(true);
        setTextFieldVisible(false);
        localStorage.setItem('isMasterAdmin', 'true');
      } else {
        alert('Incorrect password');
      }
    }
  };

  return (
    <>
      <SignedOut>
        <NotSignedIn />
      </SignedOut>
      <SignedIn>
        <div className={styles.container}>
          {!textFieldVisible ? (
            <h1 className={styles.heading}>
              <span onClick={() => handleHeadingClick("Love")} className={styles.love}>Love </span>
              <span onClick={() => handleHeadingClick("Your")} className={styles.your}>your </span>
              <span onClick={() => handleHeadingClick("Work")} className={styles.work}>work</span>
            </h1>
          ) : (
            <div className={styles.inputContainer}>
              <TextField
                label="Enter Password"
                variant="outlined"
                value={inputValue}
                autoFocus
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                fullWidth
                className={styles.inputField}
                type="password"
              />
            </div>
          )}

          {!textFieldVisible && (
            <p className={styles.subheading}>life is too short to hate it</p>
          )}

          <div className={styles.statusContainer}>
            <div className={`${styles.statusbox} ${overallColor === 'green' ? styles.statusGreen : styles.statusRed}`}>
              <h2  className={styles.statusTitle}>Marketing</h2>
              <div className={styles.metrics}>
                <div>
                  <p>Customer retention</p>
                  <p className={styles.cacText}>CAC</p>
                </div>
                <div>
                  <p>20%/month</p>
                  <p>100/week</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statusbox} ${overallColor2 === 'green' ? styles.statusGreen : styles.statusRed}`}>
              <h2  className={styles.statusTitle}>Production</h2>
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

            <div className={`${styles.statusbox} ${overallColor3 === 'green' ? styles.statusGreen : styles.statusRed}`}>
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

            {masterAdminVisible && (
              <Link href="/admin/access-management" className={styles.box}>
                Master Admin
              </Link>
            )}
          </div>
        </div>
      </SignedIn>
    </>
  );
}
