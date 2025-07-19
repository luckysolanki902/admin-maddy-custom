'use client';
import React, { useState, useEffect, useMemo } from 'react';
import styles from './styles/StatusContainer.module.css';

const StatusContainer = () => {
  const [statusMetrics, setStatusMetrics] = useState(null);
  const [lateCount, setLateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [fetchError, setFetchError] = useState(false);

  const retryFetch = () => {
    setFetchError(false);
    setIsLoading(true);
    // Clear cache to force fresh fetch
    localStorage.removeItem('departmentStatus');
    localStorage.removeItem('departmentStatusTimestamp');
    // Trigger re-fetch
    window.location.reload();
  };

  useEffect(() => {
    // Cache duration: 4 hours in milliseconds
    const CACHE_DURATION = 4 * 60 * 60 * 1000;
    
    // Calculate dates for today
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    async function fetchStatusData() {
      // Check if we have cached data
      const cached = localStorage.getItem('departmentStatus');
      const cacheTimestamp = localStorage.getItem('departmentStatusTimestamp');
      
      if (cached && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp);
        if (timeDiff < CACHE_DURATION) {
          const parsedData = JSON.parse(cached);
          
          // Validate cached data
          const validStatusMetrics = (parsedData.statusMetrics && parsedData.statusMetrics.cac !== undefined) 
            ? parsedData.statusMetrics 
            : { cac: 85, roas: 2.0, spend: 1000, revenueAfterTax: 2000 };
          
          setStatusMetrics(validStatusMetrics);
          setLateCount(parsedData.lateCount || 0);
          setLastFetched(new Date(parseInt(cacheTimestamp)));
          setIsLoading(false);
          return;
        }
      }

      try {
        setIsLoading(true);
        
        // Fetch status metrics (CAC and ROAS) for today
        const [
          statusResponse,
          lateCountResponse,
        ] = await Promise.all([
          fetch('/api/admin/department-targets/status-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: startDate,
              endDate: endDate,
            }),
          }),
          fetch(`/api/admin/department-targets/production/track-shipment-delays?startDate=${startDate}&endDate=${endDate}`),
        ]);

        // Check if all responses are ok
        if (!statusResponse.ok || !lateCountResponse.ok) {
          throw new Error('One or more API calls failed');
        }

        const statusJson = await statusResponse.json();
        const lateCountJson = await lateCountResponse.json();

        // Validate status metrics data
        const validStatusMetrics = (statusJson.success && statusJson.data) 
          ? statusJson.data 
          : { cac: 85, roas: 2.0, spend: 1000, revenueAfterTax: 2000, ordersCount: 10 };
        
        setStatusMetrics(validStatusMetrics);
        setLateCount(lateCountJson.lateCount || 0);

        // Cache the data only if fetch was successful
        const dataToCache = {
          statusMetrics: validStatusMetrics,
          lateCount: lateCountJson.lateCount || 0,
        };
        
        const timestamp = Date.now();
        localStorage.setItem('departmentStatus', JSON.stringify(dataToCache));
        localStorage.setItem('departmentStatusTimestamp', timestamp.toString());
        setLastFetched(new Date(timestamp));

      } catch (error) {
        console.error('Error fetching status data:', error);
        setFetchError(true);
        
        // If fetch fails and we have no cached data, set default values
        if (!cached) {
          setStatusMetrics({ cac: 85, roas: 2.0, spend: 1000, revenueAfterTax: 2000, ordersCount: 10 });
          setLateCount(2);
        }
        
        // Don't cache failed requests - let it retry next time
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatusData();
  }, []);

  // Memoized department status calculations
  const departmentStatus = useMemo(() => {
    const cacValue = statusMetrics?.cac;
    const roasValue = statusMetrics?.roas;
    
    // CAC status: Lower is better
    // < 100: Healthy (Green), < 150: Warning (Orange), >= 150: Critical (Red)
    const cacStatus = cacValue !== undefined ? 
      (cacValue < 100 ? 'healthy' : cacValue < 150 ? 'warning' : 'critical') : 'loading';
    
    // ROAS status: Higher is better
    // >= 3: Healthy (Green), >= 2.5: Warning (Orange), < 2.5: Critical (Red)
    const roasStatus = roasValue !== undefined ? 
      (roasValue >= 3 ? 'healthy' : roasValue >= 2.5 ? 'warning' : 'critical') : 'loading';
    
    // Marketing status: Both CAC and ROAS need to be good
    const marketingStatus = (cacStatus === 'healthy' && roasStatus === 'healthy') ? 'healthy' : 
                           (cacStatus === 'critical' || roasStatus === 'critical') ? 'critical' : 'warning';

    // Production logic: 1+ product launch per month is good
    const currentProductLaunches = 1; // This should come from your API
    const productionStatus = currentProductLaunches >= 1 ? 'healthy' : 'warning';
    
    const designStatus = 'healthy'; // Assuming design metrics are always good for now

    return {
      marketing: {
        status: marketingStatus,
        metrics: [
          { label: 'ROAS', current: roasValue ? roasValue.toFixed(2) : '...', target: '3.0', unit: 'x' },
          { label: 'CAC', current: cacValue ? `₹${Math.round(cacValue)}` : '...', target: '₹100', unit: '' }
        ]
      },
      production: {
        status: productionStatus,
        metrics: [
          { label: 'Shipment Delays', current: lateCount, target: '6', unit: '/3days' },
          { label: 'Product Launches', current: currentProductLaunches, target: '1', unit: '/month' }
        ]
      },
      design: {
        status: designStatus,
        metrics: [
          { label: 'Insta Posts', current: '5', target: '5', unit: '/day' },
          { label: 'Design Reviews', current: '8', target: '10', unit: '/week' }
        ]
      }
    };
  }, [statusMetrics, lateCount]);

  const StatusCard = ({ title, department, icon }) => {
    const status = department.status;
    const isHealthy = status === 'healthy';
    const isWarning = status === 'warning';
    const isCritical = status === 'critical';
    
    return (
      <div className={`${styles.statusCard} ${styles[status]}`}>
        <div className={styles.cardHeader}>
          <div className={styles.titleSection}>
            {/* <span className={styles.cardIcon}>{icon}</span> */}
            <h3 className={styles.cardTitle}>{title}</h3>
          </div>
          <div className={`${styles.statusIndicator} ${styles[status]}`}>
            <div className={styles.statusDot}></div>
            <span className={styles.statusText}>
              {isHealthy ? 'On Track' : isWarning ? 'Attention' : 'Critical'}
            </span>
          </div>
        </div>
        
        <div className={styles.metricsGrid}>
          {department.metrics.map((metric, index) => (
            <div key={index} className={styles.metricItem}>
              <div className={styles.metricLabel}>{metric.label}</div>
              <div className={styles.metricValues}>
                <span className={styles.currentValue}>{metric.current}</span>
                <span className={styles.targetDivider}>/</span>
                <span className={styles.targetValue}>{metric.target}</span>
                <span className={styles.unit}>{metric.unit}</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ 
                    width: (() => {
                      if (!metric.current || !metric.target) return '0%';
                      
                      // Convert current and target to numbers
                      const currentStr = String(metric.current);
                      const targetStr = String(metric.target);
                      
                      const currentValue = parseFloat(currentStr.replace(/[^\d.]/g, '')) || 0;
                      const targetValue = parseFloat(targetStr.replace(/[^\d.]/g, '')) || 1;
                      
                      const percentage = Math.min((currentValue / targetValue) * 100, 100);
                      return `${percentage}%`;
                    })()
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.statusContainer}>
      {fetchError && !isLoading && (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <h3>⚠️ Connection Issue</h3>
            <p>Unable to fetch the latest department data. Showing cached information or defaults.</p>
            <button onClick={retryFetch} className={styles.retryButton}>
              🔄 Retry
            </button>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading department status...</span>
        </div>
      )}
      
      <div className={styles.statusGrid}>
        <StatusCard 
          title="Marketing" 
          department={departmentStatus.marketing}
          icon="📈"
        />
        <StatusCard 
          title="Production" 
          department={departmentStatus.production}
          icon="🏭"
        />
        <StatusCard 
          title="Design" 
          department={departmentStatus.design}
          icon="🎨"
        />
      </div>
      
      {lastFetched && (
        <div className={styles.cacheInfo}>
          <span>Last updated: {lastFetched.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default StatusContainer;
