// /components/analytics/main/CartSourcesChart.js

'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Box, Typography, Skeleton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Updated palette for better visual appeal
const COLORS = [
    '#60A5FA',  // vibrant blue
    '#F472B6',  // pink
    '#34D399',  // emerald
    '#A78BFA',  // purple
    '#FBBF24',  // amber
    '#F87171'   // red
];

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <Box
            sx={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(8px)',
                p: 2.5,
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                color: 'white',
                minWidth: 200,
                position: 'relative',
                '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.2))',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                }
            }}
        >
            <Typography 
                variant="subtitle2" 
                sx={{ 
                    mb: 1.5, 
                    color: '#FFF',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    pb: 1
                }}
            >
                {label}
            </Typography>
            {payload.map((entry, index) => (
                <Box 
                    key={entry.name} 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 1,
                        backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        p: 0.8,
                        borderRadius: 1,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.06)'
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: entry.fill,
                                mr: 1.5,
                                boxShadow: `0 0 10px ${entry.fill}40`
                            }}
                        />
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontSize: '0.85rem',
                                color: '#EEE'
                            }}
                        >
                            {entry.name}
                        </Typography>
                    </Box>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#FFF'
                        }}
                    >
                        {entry.value}
                    </Typography>
                </Box>
            ))}
            <Box
                sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Typography 
                    variant="body2" 
                    sx={{ 
                        color: '#CCC',
                        fontSize: '0.85rem'
                    }}
                >
                    Total
                </Typography>
                <Typography 
                    variant="body2" 
                    sx={{ 
                        color: '#FFF',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}
                >
                    {total}
                </Typography>
            </Box>
        </Box>
    );
};

const CartSourcesChart = ({ data, loading }) => {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    if (loading) {
        return <Skeleton variant="rectangular" height={450} />;
    }

    // Get all unique components across the dataset
    const components = Array.from(
        data.reduce((set, row) => {
            Object.keys(row).forEach(k => {
                if (k !== 'pageType') set.add(k);
            });
            return set;
        }, new Set())
    );

    return (
        <Box
            sx={{
                width: '100%',
                background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
                p: 4,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                minHeight: 450
            }}
        >
            <Typography
                variant="h6"
                sx={{ 
                    color: 'white', 
                    fontWeight: 600, 
                    mb: 3,
                    fontSize: isSmall ? '1.1rem' : '1.25rem'
                }}
            >
                Cart Items by Page Source
            </Typography>

            <ResponsiveContainer width="100%" height={380}>
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                    barGap={0}
                    barSize={35}
                >
                    <XAxis
                        dataKey="pageType"
                        stroke="#AAA"
                        tick={{ fill: '#EEE', fontSize: isSmall ? 11 : 13 }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 0.5 }}
                        interval={0}
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

                    <Legend 
                        wrapperStyle={{
                            color: '#FFF',
                            fontSize: isSmall ? '0.8rem' : '0.9rem',
                            paddingTop: '20px'
                        }}
                        iconType="circle"
                    />

                    {components.map((comp, idx) => (
                        <Bar
                            key={comp}
                            dataKey={comp}
                            stackId="a"
                            name={comp}
                            fill={COLORS[idx % COLORS.length]}
                            radius={[4, 4, 0, 0]}
                            isAnimationActive
                            animationDuration={1500}
                            animationBegin={idx * 150}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default React.memo(CartSourcesChart);
