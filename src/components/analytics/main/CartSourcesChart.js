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

// A richer, consistent palette
const COLORS = [
    '#A78BFA', // soft amethyst
    '#E0E7FF', // light lavender
    '#FCD34D', // amber
    '#FB7185', // rose
    '#34D399', // teal
    '#60A5FA'  // sky
];

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <Box
            sx={{
                backgroundColor: '#2D2B3F',
                p: 1,
                borderRadius: 1,
                color: 'white',
                minWidth: 120
            }}
        >
            {/* <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Component: {label}
            </Typography> */}
            {payload.map((entry) => (
                <Typography key={entry.name} variant="body2">
                    PageType: {entry.name} —
                    <span style={{ color: '#A78BFA', marginLeft: 4,  }}>
                         {entry.value}
                    </span>
                </Typography>
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

    // Gather every distinct pageType across the dataset
    const pageTypes = Array.from(
        data.reduce((set, row) => {
            Object.keys(row).forEach(k => {
                if (k !== 'component') set.add(k);
            });
            return set;
        }, new Set())
    );

    return (
        <Box
            sx={{
                width: '100%',
                backgroundColor: '#2C2C2C',
                p: 3,
                borderRadius: '12px',
                boxShadow: 4,
                minHeight: 450
            }}
        >
            <Typography
                variant="h6"
                sx={{ color: 'white', fontWeight: 600, mb: 2 }}
            >
                Cart Item Sources
            </Typography>

            <ResponsiveContainer width="100%" height={350}>
                <BarChart
                    data={data}
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                >
                    <XAxis
                        dataKey="component"
                        stroke="#AAA"
                        tick={{ fill: '#EEE', fontSize: isSmall ? 10 : 12 }}
                    />
                    <YAxis stroke="#AAA" tick={{ fill: '#EEE' }} />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                    />

                    <Legend
                        wrapperStyle={{
                            color: '#FFF',
                            fontSize: isSmall ? '0.75rem' : '1rem',
                            marginBottom: theme.spacing(1)
                        }}
                    />

                    {pageTypes.map((pt, idx) => (
                        <Bar
                            key={pt}
                            dataKey={pt}
                            stackId="a"
                            name={pt}
                            fill={COLORS[idx % COLORS.length]}
                            radius={[4, 4, 0, 0]}           // rounded top corners
                            isAnimationActive
                            animationDuration={1200}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default React.memo(CartSourcesChart);
