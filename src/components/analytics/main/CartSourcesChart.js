// /components/analytics/main/CartSourcesChart.js

'use client';

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Rectangle
} from 'recharts';
import { Box, Typography, Skeleton, useMediaQuery, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { categorical } from '../common/palette';

// Updated palette for better visual appeal
const COLORS = categorical;

// Custom bar shape that only rounds top corners for the topmost segment
const CustomBarShape = (props) => {
    const { x, y, width, height, fill, isTopSegment } = props;
    
    if (!height || height <= 0) return null;
    
    const radius = isTopSegment ? 4 : 0;
    
    if (radius === 0) {
        return <Rectangle x={x} y={y} width={width} height={height} fill={fill} />;
    }
    
    // Create path with rounded top corners only
    const path = `
        M ${x},${y + radius}
        Q ${x},${y} ${x + radius},${y}
        L ${x + width - radius},${y}
        Q ${x + width},${y} ${x + width},${y + radius}
        L ${x + width},${y + height}
        L ${x},${y + height}
        Z
    `;
    
    return <path d={path} fill={fill} />;
};

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
        <Box sx={{
            background: 'rgba(17,24,39,0.8)',
            backdropFilter: 'blur(12px)',
            p: 2,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 28px -4px rgba(0,0,0,.5)',
            color: 'white',
            minWidth: 210,
            position: 'relative',
            overflow: 'hidden',
            '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: (theme) => `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main,0.6)}, transparent)`
            }
        }}>
            <Typography variant="subtitle2" sx={{ mb: 1.2, color: '#FFF', fontSize: '.9rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.12)', pb: .6 }}>{label}</Typography>
            {payload.map((entry, index) => (
                <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .8, backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent', p: 0.7, borderRadius: 1, transition: 'all .2s ease', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.fill, mr: 1.2, boxShadow: `0 0 0 1px ${entry.fill}55` }} />
                        <Typography variant="body2" sx={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.7)' }}>{entry.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '.75rem', fontWeight: 600, color: '#fff' }}>{entry.value}</Typography>
                </Box>
            ))}
            <Box sx={{ mt: 1.2, pt: 1.2, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '.7rem' }}>Total</Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: '.8rem' }}>{total}</Typography>
            </Box>
        </Box>
    );
};

const CartSourcesChart = ({ data, loading }) => {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    // Get all unique components across the dataset
    const components = Array.from(
        data.reduce((set, row) => {
            Object.keys(row).forEach(k => {
                if (k !== 'pageType') set.add(k);
            });
            return set;
        }, new Set())
    );

    // Calculate which component is the topmost for each pageType
    const topSegmentMap = useMemo(() => {
        const map = {};
        data.forEach(row => {
            // Find the last component (in render order) that has a value > 0
            let topComp = null;
            components.forEach(comp => {
                if (row[comp] && row[comp] > 0) {
                    topComp = comp;
                }
            });
            if (topComp) {
                map[row.pageType] = topComp;
            }
        });
        return map;
    }, [data, components]);

    return (
        <Box sx={{ width: '100%' }}>
            <Typography
                variant="h6"
                sx={{ 
                        color: '#fff',
                        fontWeight: 500,
                        mb: 2,
                        fontSize: isSmall ? '1.05rem' : '1.2rem'
                }}
            >
                Cart Items by Page Source
            </Typography>

            <ResponsiveContainer width="100%" height={380}>
                <BarChart data={data} margin={{ top: 10, left: 0, bottom: 5 }} barGap={0} barSize={35}>
                    <XAxis
                        dataKey="pageType"
                        stroke="#AAA"
                        tick={{ fill: '#EEE', fontSize: isSmall ? 11 : 13 }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 0.5 }}
                        interval={0}
                        // angle={-45}
                        // textAnchor="end"
                    />
                    <YAxis 
                        stroke="#AAA" 
                        tick={{ fill: '#EEE' }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 0.5 }}
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />

                    {/* <Legend 
                        wrapperStyle={{
                            color: '#FFF',
                            fontSize: isSmall ? '0.8rem' : '0.9rem',
                            paddingTop: '60px'
                        }}
                        iconType="circle"
                    /> */}

                    {components.map((comp, idx) => (
                        <Bar 
                            key={comp} 
                            dataKey={comp} 
                            stackId="a" 
                            name={comp} 
                            fill={COLORS[idx % COLORS.length]} 
                            shape={(props) => (
                                <CustomBarShape 
                                    {...props} 
                                    isTopSegment={topSegmentMap[props.payload?.pageType] === comp}
                                />
                            )}
                            isAnimationActive 
                            animationDuration={1200} 
                            animationBegin={idx * 120} 
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default React.memo(CartSourcesChart);
