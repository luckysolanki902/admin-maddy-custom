import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from './CustomerJourneyView.module.css';
import { 
  ShoppingCart, Visibility, 
  Payment, LocalShipping, CheckCircle,
  Home, Description, Info,
  Phone, Email, LocationOn, Person,
  AccessTime, FlightTakeoff
} from '@mui/icons-material';
import dayjs from 'dayjs';
import Image from 'next/image';

// Helper to categorize pages
const getPageCategory = (path) => {
  if (!path) return 'Unknown';
  if (path === '/') return 'Homepage';
  
  const staticPages = [
    '/termsandconditions', '/about-us', '/orders/track', 
    '/faqs', '/contact-us'
  ];
  if (staticPages.some(p => path.startsWith(p))) return 'Static Page';

  if (path.startsWith('/shop')) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 6) return 'Product Description Page';
    if (parts.length >= 5) return 'Product List Page';
    return 'Shop Category';
  }
  
  return 'Page Visit';
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const getDurationLabel = (diffMs) => {
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (months >= 1) return { label: `Returned after ${months} month${months > 1 ? 's' : ''}`, type: 'major' };
  if (days >= 1) return { label: `${days} day${days > 1 ? 's' : ''} later`, type: 'significant' };
  if (hours >= 1) return { label: `${hours} hour${hours > 1 ? 's' : ''} later`, type: 'minor' };
  return null;
};

export default function CustomerJourneyView({ phoneNumber, orderId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('summary');

  const fetchData = useCallback(async (query) => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/customer-journey?query=${encodeURIComponent(query)}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch data');
      }
      
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Prefer phone number, fallback to orderId
    const query = phoneNumber || orderId;
    if (query) {
      fetchData(query);
    }
  }, [phoneNumber, orderId, fetchData]);

  // Filter and process timeline events
  const processedTimeline = React.useMemo(() => {
    if (!data?.journey) return [];
    
    return data.journey.filter(event => {
      // Exclude success pages
      if (event.data?.page?.path?.includes('/orders/myorder/')) return false;

      if (event.type === 'event' && event.data?.step === 'purchase') {
        const hasOrder = data.journey.some(e => 
          e.type === 'order' && 
          Math.abs(new Date(e.timestamp) - new Date(event.timestamp)) < 60000
        );
        if (hasOrder) return false;
      }
      return true;
    });
  }, [data]);

  const finalTimeline = React.useMemo(() => {
    if (viewMode === 'full') return processedTimeline;

    const indicesToKeep = new Set();
    const orders = [];
    
    // 1. Identify orders and payment failures
    processedTimeline.forEach((event, index) => {
      if (event.type === 'order') {
        indicesToKeep.add(index);
        orders.push({ event, index });
      }
      if (event.data?.step === 'payment_initiated') {
        indicesToKeep.add(index);
      }
    });

    // 2. For each order, find related events
    orders.forEach(({ event: orderEvent, index: orderIndex }) => {
      const orderDate = dayjs(orderEvent.timestamp).format('YYYY-MM-DD');
      
      // Find last offer applied before this order
      for (let i = orderIndex - 1; i >= 0; i--) {
        const prev = processedTimeline[i];
        if (prev.type === 'order') break; // Stop at previous order
        if (prev.data?.step === 'apply_offer') {
          indicesToKeep.add(i);
          break; // Only keep the last one
        }
      }

      // Find first visit of the purchase date
      let firstVisitIndex = -1;
      for (let i = orderIndex - 1; i >= 0; i--) {
        const prev = processedTimeline[i];
        const prevDate = dayjs(prev.timestamp).format('YYYY-MM-DD');
        if (prevDate !== orderDate) break; // Different date
        
        if (prev.data?.step === 'visit') {
          firstVisitIndex = i;
        }
      }
      if (firstVisitIndex !== -1) {
        indicesToKeep.add(firstVisitIndex);
      }
    });

    // 3. Other pages (not PLP/PDP)
    processedTimeline.forEach((event, index) => {
      if (event.data?.step === 'visit') {
        const category = getPageCategory(event.data?.page?.path);
        if (category !== 'Product List Page' && category !== 'Product Description Page') {
           indicesToKeep.add(index);
        }
      }
    });

    return processedTimeline.filter((_, index) => indicesToKeep.has(index));
  }, [processedTimeline, viewMode]);

  // Get user profile data
  const userProfile = React.useMemo(() => {
    if (!data) return null;
    const user = data.user || {};
    const firstEvent = data.journey?.[0];
    const lastEvent = data.journey?.[data.journey.length - 1];
    
    let address = user.address ? 
      `${user.address.city || ''}, ${user.address.state || ''}` : 
      'Unknown Location';
      
    if (!user.address && data.journey) {
      const lastOrder = [...data.journey].reverse().find(e => e.type === 'order');
      if (lastOrder?.data?.address) {
        address = `${lastOrder.data.address.city}, ${lastOrder.data.address.state}`;
      }
    }

    return {
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Guest User',
      email: user.email,
      phone: user.phoneNumber,
      joinedAt: user.createdAt || firstEvent?.timestamp,
      lastActive: lastEvent?.timestamp,
      address,
      city: user.address?.city || (address.split(',')[0] !== 'Unknown Location' ? address.split(',')[0] : 'Unknown')
    };
  }, [data]);

  if (!phoneNumber && !orderId) {
    return <div className={styles.error}>No customer identifier provided.</div>;
  }

  return (
    <div className={styles.container}>
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.error}
        >
          <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
          {error}
        </motion.div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      )}

      {data && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Profile Card */}
          {userProfile && (
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                <div className={styles.avatar}>
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.profileInfo}>
                  <h2>{userProfile.name}</h2>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {userProfile.email && (
                      <p><Email sx={{ fontSize: 16 }} /> {userProfile.email}</p>
                    )}
                    {userProfile.phone && (
                      <p><Phone sx={{ fontSize: 16 }} /> {userProfile.phone}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={styles.profileGrid}>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Joined Maddy Custom</span>
                  <span className={styles.profileStatValue}>
                    {userProfile.joinedAt ? dayjs(userProfile.joinedAt).format('MMM D, YYYY') : '—'}
                  </span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Latest Activity</span>
                  <span className={styles.profileStatValue}>
                    {userProfile.lastActive ? dayjs(userProfile.lastActive).format('MMM D, YYYY h:mm A') : '—'}
                  </span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Location</span>
                  <span className={styles.profileStatValue}>
                    <LocationOn sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }} />
                    {userProfile.address}
                  </span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Total Orders</span>
                  <span className={styles.profileStatValue}>{data.metrics?.totalPurchases || 0}</span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Lifetime Value</span>
                  <span className={styles.profileStatValue}>{formatCurrency(data.metrics?.totalWorthPurchased || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className={styles.timeline}>
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'summary' ? styles.active : ''}`}
                onClick={() => setViewMode('summary')}
              >
                Summary
              </button>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'full' ? styles.active : ''}`}
                onClick={() => setViewMode('full')}
              >
                Full Journey
              </button>
            </div>

            <div className={styles.timelineLine} />
            
            {finalTimeline.map((event, index) => {
              const isOrder = event.type === 'order';
              const step = event.data?.step || '';
              
              // Calculate time gap
              const prevEvent = index > 0 ? finalTimeline[index - 1] : null;
              const timeDiff = prevEvent ? new Date(event.timestamp) - new Date(prevEvent.timestamp) : 0;
              const timeGap = getDurationLabel(timeDiff);

              let Icon = Visibility;
              let dotClass = styles.eventDot;
              let title = 'Event';

              if (isOrder) {
                Icon = CheckCircle;
                dotClass = `${styles.eventDot} ${styles.purchase}`;
                title = 'Order Placed';
              } else {
                switch(step) {
                  case 'visit': Icon = Home; dotClass = `${styles.eventDot} ${styles.visit}`; title = 'Site Visit'; break;
                  case 'view_product': Icon = Visibility; title = 'Viewed Product'; break;
                  case 'add_to_cart': Icon = ShoppingCart; dotClass = `${styles.eventDot} ${styles.cart}`; title = 'Added to Cart'; break;
                  case 'initiate_checkout': Icon = Payment; title = 'Checkout Started'; break;
                  case 'contact_info': Icon = Person; title = 'Entered Contact Info'; break;
                  case 'shipping_info': Icon = LocalShipping; title = 'Shipping Details'; break;
                  case 'payment_initiated': Icon = Payment; title = 'Payment Initiated'; break;
                  case 'apply_offer': Icon = Description; title = 'Applied Offer'; break;
                  default: Icon = Visibility; title = step.replace(/_/g, ' ').toUpperCase();
                }
              }

              return (
                <React.Fragment key={event.id || index}>
                  {timeGap && (
                    <motion.div 
                      className={`${styles.timeGap} ${styles[timeGap.type]}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                    >
                      <div className={styles.timeGapLine} />
                      <div className={styles.timeGapLabel}>
                        {timeGap.type === 'major' ? <FlightTakeoff sx={{ fontSize: 16 }} /> : <AccessTime sx={{ fontSize: 14 }} />}
                        {timeGap.label}
                      </div>
                      <div className={styles.timeGapLine} />
                    </motion.div>
                  )}
                  
                  <motion.div 
                    className={styles.eventNode}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={dotClass} />
                    
                    <div className={styles.eventCard}>
                      <div className={styles.eventHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Icon sx={{ color: '#fff' }} />
                          <span className={styles.eventType}>{title}</span>
                        </div>
                        <span className={styles.eventTime}>
                          {dayjs(event.timestamp).format('MMM D, YYYY h:mm A')}
                          {event.timeToNext && <span style={{ marginLeft: '10px', opacity: 0.5 }}>→ {event.timeToNext}</span>}
                        </span>
                      </div>

                      <div className={styles.eventContent}>
                        {isOrder ? (
                          <div>
                            <div style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#fff' }}>
                              {formatCurrency(event.data.totalAmount)}
                              <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '10px' }}>
                                ({event.data.itemsCount} items)
                              </span>
                            </div>
                            <div className={styles.productGrid}>
                              {event.data.items?.map((item, i) => (
                                <div key={i} className={styles.productItem}>
                                  {item.thumbnail && (
                                    <Image 
                                      src={
                                        item.thumbnail.startsWith('http') 
                                          ? item.thumbnail 
                                          : item.thumbnail.startsWith('/') 
                                            ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${item.thumbnail}`
                                            : `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${item.thumbnail}`
                                      } 
                                      alt="" 
                                      className={styles.productImage}
                                      width={50}
                                      height={50}
                                    />
                                  )}
                                  <div>
                                    <div style={{ color: '#fff', fontWeight: 500 }}>{item.name}</div>
                                    <div style={{ fontSize: '0.8rem' }}>
                                      Qty: {item.quantity} • {formatCurrency(item.priceAtPurchase)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Step Specific Content */}
                            {step === 'visit' && event.data?.page?.path && (
                              <div style={{ marginBottom: '0.5rem' }}>
                                <span className={`${styles.tag} ${
                                  getPageCategory(event.data.page.path).includes('Home') ? styles.home :
                                  getPageCategory(event.data.page.path).includes('Product') ? styles.product :
                                  styles.category
                                }`}>
                                  {getPageCategory(event.data.page.path)}
                                </span>
                                <span style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
                                  {event.data.page.path}
                                </span>
                              </div>
                            )}

                            {step === 'contact_info' && event.data?.metadata?.contact && (
                              <div className={styles.metaInfo} style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <div className={styles.metaItem}>
                                  <Person className={styles.icon} />
                                  <span style={{ color: '#fff' }}>{event.data.metadata.contact.name}</span>
                                </div>
                                <div className={styles.metaItem}>
                                  <Email className={styles.icon} />
                                  <span style={{ color: '#fff' }}>{event.data.metadata.contact.email}</span>
                                </div>
                                <div className={styles.metaItem}>
                                  <Phone className={styles.icon} />
                                  <span style={{ color: '#fff' }}>{event.data.metadata.contact.phoneNumber}</span>
                                </div>
                              </div>
                            )}

                            {step === 'apply_offer' && event.data?.metadata && (
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className={styles.tag} style={{ background: 'rgba(0, 255, 157, 0.15)', color: '#00ff9d' }}>
                                  {event.data.metadata.couponCode}
                                </div>
                                <span style={{ color: '#fff' }}>
                                  Discount: {formatCurrency(event.data.metadata.discountAmount)}
                                </span>
                              </div>
                            )}

                            {step === 'add_to_cart' && event.data?.product && (
                              <div className={styles.productItem} style={{ marginTop: '0.5rem' }}>
                                <div>
                                  <div style={{ color: '#fff', fontWeight: 500 }}>
                                    {event.data.product.name} 
                                    <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: '5px' }}>
                                      ({event.data.product.category})
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem' }}>
                                    Qty: {event.data.product.quantity} • {formatCurrency(event.data.product.price)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Fallback for other product events */}
                            {['view_product'].includes(step) && event.data?.product && (
                              <div className={styles.productItem} style={{ marginTop: '0.5rem' }}>
                                <div>
                                  <div style={{ color: '#fff', fontWeight: 500 }}>{event.data.product.name}</div>
                                  <div style={{ fontSize: '0.8rem' }}>
                                    {formatCurrency(event.data.product.price)}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Cart Info - Only show if NOT in specific steps that hide it */}
                            {!['visit', 'apply_offer', 'contact_info', 'add_to_cart'].includes(step) && event.data?.cart && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                Cart: {event.data.cart.items} items • {formatCurrency(event.data.cart.value)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* UTM & Meta Info */}
                        {(event.data?.utm || event.data?.source) && (
                          <div className={styles.metaInfo}>
                            {event.data?.utm?.source && (
                              <div className={styles.metaItem}>
                                <span style={{ opacity: 0.5 }}>Source:</span>
                                <span style={{ color: '#fff' }}>{event.data.utm.source}</span>
                              </div>
                            )}
                            {event.data?.utm?.campaign && (
                              <div className={styles.metaItem}>
                                <span style={{ opacity: 0.5 }}>Campaign:</span>
                                <span style={{ color: '#fff' }}>{event.data.utm.campaign}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
