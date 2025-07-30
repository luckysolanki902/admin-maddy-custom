'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Tooltip } from '@mui/material';
import styles from './styles/StatusContainer.module.css';

const StatusContainer = () => {
  // Marketing data (dynamic - never cached if zero)
  const [marketingData, setMarketingData] = useState({
    roas: null,
    cac: null,
    spend: 0,
    revenue: 0,
    revenueAfterTax: 0,
    isLoading: true
  });

  // Production data (dynamic)
  const [productionData, setProductionData] = useState({
    shipmentDelays: null,
    productLaunches: 1, // Static for now
    isLoading: true
  });

  // Design data (static)
  const [designData] = useState({
    instaPosts: 5,
    designReviews: 8,
    isLoading: false
  });

  const [lastFetched, setLastFetched] = useState(null);
  const [fetchError, setFetchError] = useState(false);

  // Metric threshold definitions for tooltips
  const metricThresholds = {
    'ROAS': {
      title: 'Return on Ad Spend',
      healthy: '≥ 3.0x',
      warning: '2.5x - 2.99x',
      critical: '< 2.5x',
      description: 'Revenue generated per rupee spent on ads'
    },
    'CAC': {
      title: 'Customer Acquisition Cost',
      healthy: '< ₹150',
      warning: '₹150 - ₹199',
      critical: '≥ ₹200',
      description: 'Cost to acquire one customer'
    },
    'Shipment Delays': {
      title: 'Late Shipments',
      healthy: '≤ 6 orders',
      warning: '7 - 10 orders',
      critical: '> 10 orders',
      description: 'Orders delayed beyond 2 days per 3-day period'
    },
    'Product Launches': {
      title: 'New Products',
      healthy: '≥ 1 product',
      warning: '< 1 product',
      critical: 'No launches',
      description: 'New products launched per month'
    },
    'Insta Posts': {
      title: 'Instagram Content',
      healthy: '≥ 5 posts',
      warning: '3 - 4 posts',
      critical: '< 3 posts',
      description: 'Daily Instagram posts for brand engagement'
    },
    'Design Reviews': {
      title: 'Design Quality Control',
      healthy: '≥ 8 reviews',
      warning: '5 - 7 reviews',
      critical: '< 5 reviews',
      description: 'Weekly design reviews and approvals'
    }
  };

  // Check if we should use cache for marketing data
  const shouldUseMarketingCache = (cachedData) => {
    if (!cachedData?.marketingData) return false;
    // Never cache if CAC, ROAS, or spend is zero/null
    const { cac, roas, spend } = cachedData.marketingData;
    return cac > 0 && roas > 0 && spend > 0;
  };

  // Fetch Marketing Data
  const fetchMarketingData = async () => {
    try {
      setMarketingData(prev => ({ ...prev, isLoading: true }));
      
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      // Check cache first (only if valid data exists)
      const cached = localStorage.getItem('departmentStatus');
      const cacheTimestamp = localStorage.getItem('departmentStatusTimestamp');
      
      if (cached && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp);
        const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
        
        if (timeDiff < CACHE_DURATION) {
          const parsedData = JSON.parse(cached);
          if (shouldUseMarketingCache(parsedData)) {
            setMarketingData({ ...parsedData.marketingData, isLoading: false });
            setLastFetched(new Date(parseInt(cacheTimestamp)));
            return;
          }
        }
      }

      // Fetch fresh data
      const [ordersResponse, cacResponse] = await Promise.all([
        fetch(`/api/admin/get-main/get-orders?startDate=${startDate}&endDate=${endDate}&limit=1000`),
        fetch('/api/admin/get-main/get-facebook-cac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        })
      ]);

      const ordersData = ordersResponse.ok ? await ordersResponse.json() : {};
      const cacData = cacResponse.ok ? await cacResponse.json() : {};

      // Process data
      const revenue = ordersData?.revenue || 0;
      const revenueAfterTax = revenue > 0 ? revenue - (revenue * 18 / 118) : 0;
      const spend = cacData?.spend || 0;
      const cac = cacData?.cac || 0;
      const roas = spend > 0 ? revenueAfterTax / spend : 0;

      const newMarketingData = {
        roas,
        cac,
        spend,
        revenue,
        revenueAfterTax,
        isLoading: false
      };

      setMarketingData(newMarketingData);

      // Cache only if we have valid non-zero data
      if (roas > 0 && cac > 0 && spend > 0) {
        const timestamp = Date.now();
        const dataToCache = { marketingData: newMarketingData };
        localStorage.setItem('departmentStatus', JSON.stringify(dataToCache));
        localStorage.setItem('departmentStatusTimestamp', timestamp.toString());
        setLastFetched(new Date(timestamp));
      }

    } catch (error) {
      console.error('Marketing data fetch error:', error);
      setMarketingData(prev => ({ ...prev, isLoading: false }));
      setFetchError(true);
    }
  };

  // Fetch Production Data
  const fetchProductionData = async () => {
    try {
      setProductionData(prev => ({ ...prev, isLoading: true }));
      
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      const response = await fetch(`/api/admin/department-targets/production/track-shipment-delays?startDate=${startDate}&endDate=${endDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setProductionData({
          shipmentDelays: data.lateCount || 0,
          productLaunches: 1, // Static value for now
          isLoading: false
        });
      } else {
        throw new Error('Production API failed');
      }

    } catch (error) {
      console.error('Production data fetch error:', error);
      setProductionData({
        shipmentDelays: 0,
        productLaunches: 1,
        isLoading: false
      });
      setFetchError(true);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMarketingData();
    fetchProductionData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate department statuses
  const departmentStatus = useMemo(() => {
    // Marketing Status Logic
    const getMarketingStatus = () => {
      if (marketingData.isLoading) return 'loading';
      
      const { roas, cac } = marketingData;
      
      // If no data available
      if (roas === null || cac === null || roas === 0 || cac === 0) {
        return 'warning';
      }

      // CAC status: < 200 healthy, < 250 warning, >= 250 critical
      const cacStatus = cac < 200 ? 'healthy' : cac < 250 ? 'warning' : 'critical';
      
      // ROAS status: >= 3 healthy, >= 2.5 warning, < 2.5 critical
      const roasStatus = roas >= 3 ? 'healthy' : roas >= 2.5 ? 'warning' : 'critical';
      
      // Overall marketing status: worst of both
      if (cacStatus === 'critical' || roasStatus === 'critical') return 'critical';
      if (cacStatus === 'warning' || roasStatus === 'warning') return 'warning';
      return 'healthy';
    };

    // Production Status Logic
    const getProductionStatus = () => {
      if (productionData.isLoading) return 'loading';
      
      const { shipmentDelays, productLaunches } = productionData;
      
      // Shipment delays: <= 6 healthy, <= 10 warning, > 10 critical
      const delayStatus = shipmentDelays <= 6 ? 'healthy' : shipmentDelays <= 10 ? 'warning' : 'critical';
      
      // Product launches: >= 1 healthy (for now always healthy)
      const launchStatus = productLaunches >= 1 ? 'healthy' : 'warning';
      
      // Overall production status: worst of both
      if (delayStatus === 'critical' || launchStatus === 'critical') return 'critical';
      if (delayStatus === 'warning' || launchStatus === 'warning') return 'warning';
      return 'healthy';
    };

    // Design Status Logic (Static - always healthy)
    const getDesignStatus = () => {
      if (designData.isLoading) return 'loading';
      return 'healthy'; // Always healthy for now
    };

    return {
      marketing: {
        status: getMarketingStatus(),
        metrics: [
          {
            label: 'ROAS',
            current: marketingData.isLoading ? 'Loading...' : 
                    marketingData.roas > 0 ? marketingData.roas.toFixed(2) : '0.00',
            target: '3.0',
            unit: 'x',
            isLoading: marketingData.isLoading
          },
          {
            label: 'CAC',
            current: marketingData.isLoading ? 'Loading...' : 
                    marketingData.cac > 0 ? `₹${Math.round(marketingData.cac)}` : '₹0',
            target: '₹200',
            unit: '',
            isLoading: marketingData.isLoading
          }
        ]
      },
      production: {
        status: getProductionStatus(),
        metrics: [
          {
            label: 'Shipment Delays',
            current: productionData.isLoading ? 'Loading...' : productionData.shipmentDelays,
            target: '6',
            unit: '/3days',
            isLoading: productionData.isLoading
          },
          {
            label: 'Product Launches',
            current: productionData.productLaunches,
            target: '1',
            unit: '/month',
            isLoading: false
          }
        ]
      },
      design: {
        status: getDesignStatus(),
        metrics: [
          {
            label: 'Insta Posts',
            current: designData.instaPosts,
            target: '5',
            unit: '/day',
            isLoading: false
          },
          {
            label: 'Design Reviews',
            current: designData.designReviews,
            target: '10',
            unit: '/week',
            isLoading: false
          }
        ]
      }
    };
  }, [marketingData, productionData, designData]);

  const StatusCard = ({ title, department }) => {
    if (!department || !department.metrics) {
      return (
        <div className={`${styles.statusCard} ${styles.loading}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleSection}>
              <h3 className={styles.cardTitle}>{title}</h3>
            </div>
            <div className={`${styles.statusIndicator} ${styles.loading}`}>
              <div className={styles.statusDot}></div>
              <span className={styles.statusText}>Loading...</span>
            </div>
          </div>
        </div>
      );
    }

    const status = department.status;
    
    return (
      <div className={`${styles.statusCard} ${styles[status]}`}>
        <div className={styles.cardHeader}>
          <div className={styles.titleSection}>
            <h3 className={styles.cardTitle}>{title}</h3>
          </div>
          <div className={`${styles.statusIndicator} ${styles[status]}`}>
            <div className={styles.statusDot}></div>
            <span className={styles.statusText}>
              {status === 'healthy' ? 'On Track' : 
               status === 'warning' ? 'Attention' : 
               status === 'critical' ? 'Critical' : 'Loading...'}
            </span>
          </div>
        </div>
        
        <div className={styles.metricsGrid}>
          {department.metrics.map((metric, index) => {
            const thresholdInfo = metricThresholds[metric.label];
            
            const tooltipContent = thresholdInfo ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  {thresholdInfo.title}
                </div>
                <div style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                  {thresholdInfo.description}
                </div>
                <div style={{ fontSize: '0.85em' }}>
                  <div style={{ color: '#4caf50', marginBottom: '2px' }}>
                    Healthy: {thresholdInfo.healthy}
                  </div>
                  <div style={{ color: '#ff9800', marginBottom: '2px' }}>
                    Attention: {thresholdInfo.warning}
                  </div>
                  <div style={{ color: '#f44336' }}>
                    Critical: {thresholdInfo.critical}
                  </div>
                </div>
              </div>
            ) : '';
            
            return (
              <Tooltip
                key={index}
                title={tooltipContent}
                arrow
                placement="top"
                componentsProps={{
                  tooltip: {
                    sx: {
                      bgcolor: 'rgba(55, 65, 81, 0.95)',
                      color: 'white',
                      fontSize: '0.875rem',
                      maxWidth: '280px',
                      '& .MuiTooltip-arrow': {
                        color: 'rgba(55, 65, 81, 0.95)',
                      },
                    },
                  },
                }}
              >
                <div className={styles.metricItem}>
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
                          if (metric.isLoading) return '0%';
                          if (!metric.current || !metric.target) return '0%';
                          
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
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  };

  // Loading check
  const isOverallLoading = marketingData.isLoading && productionData.isLoading;

  return (
    <div className={styles.statusContainer}>
      {fetchError && (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <h3>⚠️ Connection Issue</h3>
            <p>Some department data may be unavailable due to network issues.</p>
          </div>
        </div>
      )}
      
      {isOverallLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading department status...</span>
        </div>
      )}
      
      <div className={styles.statusGrid}>
        <StatusCard 
          title="Marketing" 
          department={departmentStatus.marketing}
        />
        <StatusCard 
          title="Production" 
          department={departmentStatus.production}
        />
        <StatusCard 
          title="Design" 
          department={departmentStatus.design}
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
