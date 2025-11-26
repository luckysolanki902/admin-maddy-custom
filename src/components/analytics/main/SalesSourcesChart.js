// /components/analytics/main/SalesSourcesChart.js

'use client';

import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, alpha, Chip, Collapse, IconButton } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Campaign, Public, Instagram, Facebook, HelpOutline } from '@mui/icons-material';

// Beautiful gradient colors for the two main categories
const CATEGORY_STYLES = {
  'Meta Ads': {
    primary: '#0668E1',
    gradient: ['#0668E1', '#00C6FF'],
    glow: 'rgba(6, 104, 225, 0.4)',
    Icon: Campaign
  },
  'Organic': {
    primary: '#10B981',
    gradient: ['#10B981', '#34D399'],
    glow: 'rgba(16, 185, 129, 0.4)',
    Icon: Public
  }
};

// Subsection styles for Meta Ads breakdown
const SUBSECTION_STYLES = {
  'Instagram': {
    primary: '#E4405F',
    gradient: ['#E4405F', '#FCAF45'],
    Icon: Instagram
  },
  'Facebook': {
    primary: '#1877F2',
    gradient: ['#1877F2', '#42B0FF'],
    Icon: Facebook
  },
  'Unknown': {
    primary: '#6B7280',
    gradient: ['#6B7280', '#9CA3AF'],
    Icon: HelpOutline
  }
};

// Patterns to categorize Meta Ads sources into Instagram, Facebook, or Unknown
const categorizeMetaSource = (sourceName) => {
  const name = sourceName?.toLowerCase() || '';
  
  // Instagram patterns
  if (name.includes('instagram') || name.includes('ig_') || name === 'ig' || 
      name.includes('ig-') || name.includes('insta') || name.includes('reels')) {
    return 'Instagram';
  }
  
  // Facebook patterns
  if (name.includes('facebook') || name.includes('fb_') || name === 'fb' || 
      name.includes('fb-') || name.includes('fb ')) {
    return 'Facebook';
  }
  
  // Unknown (bonnet wrap, pillar wrap, key chain, {{placement}}, th, etc.)
  return 'Unknown';
};

// Active shape for hover effect
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 12px ${fill}80)`,
          transition: 'all 0.3s ease'
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

// Custom tooltip with high z-index
const CustomTooltip = ({ active, payload, totalOrders }) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0];
  const sourceName = data.payload.source;
  const categoryStyle = CATEGORY_STYLES[sourceName] || CATEGORY_STYLES['Organic'];
  const breakdown = data.payload.breakdown || [];
  const IconComponent = categoryStyle.Icon;

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${alpha(categoryStyle.primary, 0.3)}`,
        boxShadow: `0 8px 32px -4px rgba(0,0,0,.6), 0 0 20px ${categoryStyle.glow}`,
        color: 'white',
        minWidth: 260,
        maxWidth: 320,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 9999,
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${categoryStyle.gradient[0]}, ${categoryStyle.gradient[1]})`
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${categoryStyle.gradient[0]}, ${categoryStyle.gradient[1]})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${categoryStyle.glow}`
          }}
        >
          <IconComponent sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography 
            sx={{ 
              color: '#FFF',
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}
          >
            {sourceName}
          </Typography>
          <Typography 
            sx={{ 
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            {breakdown.length} source{breakdown.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box
          sx={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            p: 1.5,
            textAlign: 'center'
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', mb: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Orders
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>
            {data.value.toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            background: `linear-gradient(135deg, ${alpha(categoryStyle.primary, 0.15)}, ${alpha(categoryStyle.gradient[1], 0.1)})`,
            borderRadius: 2,
            p: 1.5,
            textAlign: 'center',
            border: `1px solid ${alpha(categoryStyle.primary, 0.2)}`
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', mb: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Share
          </Typography>
          <Typography sx={{ color: categoryStyle.gradient[1], fontSize: '1.4rem', fontWeight: 700 }}>
            {((data.value / totalOrders) * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Source Item Component
const SourceItem = ({ source, categoryStyle, index }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: 0.75,
      px: 1,
      borderRadius: 1,
      mb: 0.5,
      background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
      '&:hover': { background: 'rgba(255,255,255,0.05)' }
    }}
  >
    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {source.name || 'Direct'}
    </Typography>
    <Chip
      label={source.count}
      size="small"
      sx={{
        background: alpha(categoryStyle.primary, 0.15),
        color: categoryStyle.gradient[1],
        fontSize: '0.7rem',
        height: 20,
        fontWeight: 600,
        '& .MuiChip-label': { px: 1 }
      }}
    />
  </Box>
);

// Subsection Accordion Component for Meta Ads
const SubsectionAccordion = ({ title, sources, style, totalCount }) => {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = style.Icon;

  if (!sources.length) return null;

  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 2,
        mb: 1,
        border: `1px solid ${alpha(style.primary, 0.15)}`,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          '&:hover': { background: 'rgba(255,255,255,0.03)' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1,
              background: `linear-gradient(135deg, ${style.gradient[0]}, ${style.gradient[1]})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconComponent sx={{ color: '#fff', fontSize: 14 }} />
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            ({sources.length})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: style.gradient[1], fontSize: '0.9rem', fontWeight: 600 }}>
            {totalCount}
          </Typography>
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)', p: 0.25 }}>
            {expanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1.5, maxHeight: 150, overflowY: 'auto' }}>
          {sources.map((s, i) => (
            <SourceItem key={i} source={s} categoryStyle={style} index={i} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const SalesSourcesChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [activeIndex, setActiveIndex] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Process data - it now comes pre-categorized from API
  const { chartData, totalOrders, metaSubsections } = useMemo(() => {
    if (!data?.length) return { chartData: [], totalOrders: 0, metaSubsections: {} };

    const total = data.reduce((sum, item) => sum + item.orderCount, 0);

    const processed = data.map(item => ({
      source: item.source,
      value: item.orderCount,
      breakdown: item.breakdown || [],
      color: CATEGORY_STYLES[item.source]?.primary || '#6B7280'
    }));

    // Process Meta Ads breakdown into subsections
    const metaData = data.find(d => d.source === 'Meta Ads');
    const subsections = { Instagram: [], Facebook: [], Unknown: [] };
    
    if (metaData?.breakdown) {
      metaData.breakdown.forEach(source => {
        const category = categorizeMetaSource(source.name);
        subsections[category].push(source);
      });
    }

    return {
      chartData: processed,
      totalOrders: total,
      metaSubsections: subsections
    };
  }, [data]);

  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(null);

  // Center stats
  const CenterStats = () => (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none'
      }}
    >
      <Typography
        sx={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.55rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          mb: 0.25
        }}
      >
        Total
      </Typography>
      <Typography
        sx={{
          color: '#fff',
          fontSize: isSmallScreen ? '1.3rem' : '1.5rem',
          fontWeight: 800,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        {totalOrders.toLocaleString()}
      </Typography>
    </Box>
  );

  if (!chartData.length) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No sales data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      {/* Main Layout: Chart on left, Accordions on right for desktop */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: isSmallScreen ? 'column' : 'row',
          gap: isSmallScreen ? 2 : 4,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 800,
          mx: 'auto'
        }}
      >
        {/* Left: Pie Chart */}
        <Box 
          sx={{ 
            position: 'relative', 
            height: isSmallScreen ? 200 : 220,
            width: isSmallScreen ? 200 : 220,
            flexShrink: 0
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="metaGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={CATEGORY_STYLES['Meta Ads'].gradient[0]} />
                  <stop offset="100%" stopColor={CATEGORY_STYLES['Meta Ads'].gradient[1]} />
                </linearGradient>
                <linearGradient id="organicGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={CATEGORY_STYLES['Organic'].gradient[0]} />
                  <stop offset="100%" stopColor={CATEGORY_STYLES['Organic'].gradient[1]} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={isSmallScreen ? 70 : 80}
                innerRadius={isSmallScreen ? 42 : 50}
                paddingAngle={3}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                style={{ filter: 'url(#glow)' }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.source === 'Meta Ads' ? 'url(#metaGradient)' : 'url(#organicGradient)'}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={2}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip totalOrders={totalOrders} />}
                cursor={{ opacity: 0.5 }}
                wrapperStyle={{ zIndex: 9999 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <CenterStats />
        </Box>

        {/* Right: Category Accordions */}
        <Box sx={{ flex: 1, width: isSmallScreen ? '100%' : 'auto', minWidth: isSmallScreen ? 'auto' : 320 }}>
          {chartData.map((item, itemIndex) => {
            const categoryStyle = CATEGORY_STYLES[item.source] || CATEGORY_STYLES['Organic'];
            const breakdown = item.breakdown || [];
            const isExpanded = expandedCategory === item.source;
            const percentage = ((item.value / totalOrders) * 100).toFixed(1);
            const IconComponent = categoryStyle.Icon;
            const isMetaAds = item.source === 'Meta Ads';

            return (
              <Box
                key={item.source}
                sx={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                  borderRadius: 3,
                  p: 2,
                  mb: itemIndex === chartData.length - 1 ? 0 : 2,
                  border: `1px solid ${alpha(categoryStyle.primary, 0.2)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: alpha(categoryStyle.primary, 0.4),
                  }
                }}
              >
                {/* Card Header */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedCategory(isExpanded ? null : item.source)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${categoryStyle.gradient[0]}, ${categoryStyle.gradient[1]})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 12px ${categoryStyle.glow}`
                      }}
                    >
                      <IconComponent sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                        {item.source}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                        {breakdown.length} source{breakdown.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
                        {item.value.toLocaleString()}
                      </Typography>
                      <Typography sx={{ color: categoryStyle.gradient[1], fontSize: '0.75rem', fontWeight: 600 }}>
                        {percentage}%
                      </Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Expandable Content */}
                <Collapse in={isExpanded}>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {isMetaAds ? (
                      // Meta Ads: Show subsections (Instagram, Facebook, Unknown)
                      <Box>
                        <SubsectionAccordion 
                          title="Instagram" 
                          sources={metaSubsections.Instagram} 
                          style={SUBSECTION_STYLES.Instagram}
                          totalCount={metaSubsections.Instagram.reduce((sum, s) => sum + s.count, 0)}
                        />
                        <SubsectionAccordion 
                          title="Facebook" 
                          sources={metaSubsections.Facebook} 
                          style={SUBSECTION_STYLES.Facebook}
                          totalCount={metaSubsections.Facebook.reduce((sum, s) => sum + s.count, 0)}
                        />
                        <SubsectionAccordion 
                          title="Unknown" 
                          sources={metaSubsections.Unknown} 
                          style={SUBSECTION_STYLES.Unknown}
                          totalCount={metaSubsections.Unknown.reduce((sum, s) => sum + s.count, 0)}
                        />
                      </Box>
                    ) : (
                      // Organic: Show flat list
                      <Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          All Sources
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                          {breakdown.map((s, i) => (
                            <SourceItem key={i} source={s} categoryStyle={categoryStyle} index={i} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(SalesSourcesChart);
