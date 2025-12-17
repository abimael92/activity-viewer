'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import type { Chart as ChartJS, ChartDataset, TooltipItem } from 'chart.js';
import { ChartData } from '@/types';

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

// Extend Chart dataset type with our mutable custom properties to avoid using `any`
type MutableDataset = ChartDataset<'line'> & {
    _originalBorderWidth?: number;
    _originalPointRadius?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
};

export default function Charts({ chartData, username, daysFilter }: ChartsProps) {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJS | null>(null);
    const [selectedDataset, setSelectedDataset] = useState<number | null>(null);

    useEffect(() => {
        if (!chartRef.current || !chartData) return;

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        // Ensure transitions.active conforms to Chart.js TransitionSpec type
        // Provide a minimal spec to disable default active animation while satisfying types
        (Chart.defaults.transitions as Record<string, unknown>).active = {
            animation: false,
            animations: {}
        };


        // Create the chart with proper typing
        chartInstance.current = new Chart(ctx, {
            type: 'line' as const,
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                    ...dataset,
                    type: 'line' as const,
                    borderWidth: 2,
                    hoverBorderWidth: 4,
                    pointBorderWidth: 2,
                    pointHoverBorderWidth: 4,
                    pointRadius: 3,
                    pointHoverRadius: 8,
                    hoverBackgroundColor: dataset.backgroundColor,
                    hoverBorderColor: dataset.borderColor,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,

                // Required so Chart.js detects click events
                events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],

                hover: {
                    mode: 'index',
                    intersect: false,
                },

                layout: {
                    padding: {
                        top: 30, // Space between legend and chart
                        bottom: 30,
                        left: 10,
                        right: 10
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
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
                                    const d = new Date(fullDate + "T12:00:00");

                                    if (isNaN(d.getTime())) return 'Invalid date';

                                    return d.toLocaleDateString('en-US', {
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
                    },

                },
                // Scales moved to root level - fix for structure issue
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
                }
            },
            plugins: [
                {
                    id: "clickHighlight",
                    beforeDatasetsDraw(chart) {
                        // This ensures our changes persist between redraws
                        chart.data.datasets.forEach((dataset, index) => {
                            const meta = chart.getDatasetMeta(index);
                            if (meta.hidden) return;

                            // Store the original values if not already stored
                            const d = dataset as MutableDataset;
                            if (!d._originalBorderWidth) {
                                if (typeof dataset.borderWidth === 'number') {
                                    d._originalBorderWidth = dataset.borderWidth;
                                } else {
                                    d._originalBorderWidth = undefined;
                                }
                                d._originalPointRadius = d.pointRadius;
                            }
                        });
                    }
                },
                {
                    id: "fadeOthersOnClick",
                    afterEvent(chart, args) {
                        if (args.event.type !== "click") return;

                        const points = chart.getElementsAtEventForMode(
                            args.event as unknown as Event,
                            "nearest",
                            { intersect: true },
                            false
                        );

                        if (!points.length) return;

                        const clickedIndex = points[0].datasetIndex;
                        const clickedDataset = chart.data.datasets[clickedIndex] as MutableDataset;

                        // Check if this dataset is already highlighted
                        const isCurrentlyHighlighted = clickedDataset.borderWidth === 4;

                        chart.data.datasets.forEach((dataset, idx) => {
                            const d = dataset as MutableDataset;

                            if (isCurrentlyHighlighted) {
                                // Reset all to normal
                                dataset.borderWidth = 2;
                                d.pointRadius = 3;
                                d.pointHoverRadius = 8;
                            } else {
                                // Bold clicked, hide others
                                if (idx === clickedIndex) {
                                    dataset.borderWidth = 4;
                                    d.pointRadius = 6;
                                    d.pointHoverRadius = 10;
                                } else {
                                    dataset.borderWidth = 1;
                                    d.pointRadius = 0;
                                    d.pointHoverRadius = 0;
                                }
                            }
                        });

                        chart.update('none');
                    }
                }
            ]
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