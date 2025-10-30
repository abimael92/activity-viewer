'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartData } from '@/types';
import { TooltipItem } from 'chart.js';


interface ChartsProps {
    chartData: ChartData;
    username: string;
    daysFilter: number;
}

// Define proper types for tooltip callbacks
type TooltipContext = TooltipItem<'line'> & {
    parsed: { y: number };
    dataset: { label: string };
};

type TooltipItems = TooltipContext[];

export default function Charts({ chartData, username, daysFilter }: ChartsProps) {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current || !chartData) return;

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        // Create the chart with proper typing
        chartInstance.current = new Chart(ctx, {
            type: 'line' as const,
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                    ...dataset,
                    type: 'line' as const,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 30, // Space between legend and chart
                        bottom: 30,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom' as const,
                        labels: {
                            color: 'rgba(255, 255, 255, 0.9)',
                            font: {
                                size: 14, // Bigger font size
                                // weight: 'bold' as const,
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        },
                    },
                    tooltip: {
                        mode: 'index' as const,
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        padding: 12, // Add more padding for better spacing
                        bodySpacing: 8, // Add spacing between body lines
                        titleSpacing: 6,
                        callbacks: {
                            title: (tooltipItems: TooltipItems) => {
                                if (!tooltipItems.length) return '';

                                const index = tooltipItems[0].dataIndex;
                                const fullDate = chartData.fullDates[index];

                                if (!fullDate) return 'Invalid date';

                                try {
                                    const date = new Date(fullDate + 'T00:00:00');
                                    if (isNaN(date.getTime())) return 'Invalid date';

                                    return date.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                } catch {
                                    return 'Invalid date';
                                }
                            },

                            label: (context: TooltipContext) => {
                                const value = context.parsed.y;
                                if (value === 0 || isNaN(value)) {
                                    return '';
                                }

                                const label = context.dataset.label || 'Unknown Repository';
                                return `${label}: ${value} commit${value !== 1 ? 's' : ''}`;
                            },

                            afterBody: (tooltipItems: TooltipItems) => {
                                if (!tooltipItems.length) return '';

                                const total = tooltipItems.reduce((sum: number, item: TooltipContext) => {
                                    const value = item.parsed.y;
                                    return sum + (isNaN(value) ? 0 : value);
                                }, 0);

                                if (total === 0) {
                                    return 'No commits on this day';
                                }

                                return `Total: ${total} commit${total !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Commits per Day',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            stepSize: 1,
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: function (value) {
                                return value;
                            }
                        },
                        afterDataLimits: (scale) => {
                            const maxValue = Math.max(...chartData.datasets.flatMap(dataset => dataset.data));
                            scale.max = maxValue + 4; // Add 4 extra ticks at top
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Commits Date',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: 10,
                            maxTicksLimit: 15,
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [chartData]);

    if (!chartData || chartData.datasets.length === 0) {
        return (
            <div className="empty-state">
                <h3>No commit activity found</h3>
                <p>No commit data available for {username}&apos;s repositories in the last {daysFilter} days.</p>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <h2>{username}&apos;s Daily Commit Activity (Last {daysFilter} Days)</h2>
            <p className="chart-subtitle">Click legend items to toggle repositories</p>
            <div className="chart-wrapper">
                <canvas ref={chartRef} id="commitChart" />
            </div>
        </div>
    );
}