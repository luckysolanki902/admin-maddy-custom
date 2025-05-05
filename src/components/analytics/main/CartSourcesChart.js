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

    return (
        <Box
            sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                p: 2,
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                color: 'white',
                minWidth: 180
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#CCC' }}>
                {label}
            </Typography>
            {payload.map((entry) => (
                <Box 
                    key={entry.name} 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 0.5 
                    }}
                >
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: entry.fill,
                            mr: 1
                        }}
                    />
                    <Typography variant="body2">
                        {entry.name}: {entry.value}
                    </Typography>
                </Box>
            ))}
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
                backgroundColor: '#2C2C2C',
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
