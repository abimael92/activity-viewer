// components/RepoActivitySection.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import './RepoActivitySection.css';
import Tooltip from './Tooltip';
import DateModal from "./DateModal";

interface RepoActivity {
    name: string;
    yesterdayCommits: number;
    todayCommits: number;
    change: number;
    trend: 'up' | 'down' | 'same';
    extra: Record<string, number>;
}

interface RepoActivitySectionProps {
    className?: string;
    username: string;
    activityData: RepoActivity[];
    loading: boolean;
    dates: { today: string; yesterday: string };
    onRefresh: (extraDates: string[]) => void;
    rateLimited?: boolean;
    rateLimitMessage?: string;
}

export function RepoActivitySection({ 
    className = '', 
    username, 
    activityData, 
    loading, 
    dates, 
    onRefresh,
    rateLimited = false,
    rateLimitMessage
}: RepoActivitySectionProps) {
    const [extraDates, setExtraDates] = useState<string[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [timeUntilRefresh, setTimeUntilRefresh] = useState(3600); // 1 hour in seconds
    const [isManualRefresh, setIsManualRefresh] = useState(false);

    // Use refs to track if refresh is manual or auto
    const isManualRefreshRef = useRef(false);
    const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Refresh handler that calls parent's onRefresh
    const handleRefresh = (isManual = false) => {
        if (isManual) {
            setIsManualRefresh(true);
            isManualRefreshRef.current = true;
        }
        // Always allow manual refresh, even if rate limited
        onRefresh(extraDates);
    };

    // When extra dates are added, refresh data with those dates
    useEffect(() => {
        if (extraDates.length > 0) {
            onRefresh(extraDates);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraDates]);

    // Update grid columns when extraDates changes
    useEffect(() => {
        const updateGridColumns = () => {
            const extraColumns = extraDates.length;
            const gridTemplate = `minmax(200px, 1fr) 100px 100px ${'90px '.repeat(extraColumns)}100px`;

            const activityHeaders = document.querySelectorAll('.activity-header');
            const activityRows = document.querySelectorAll('.activity-row');

            activityHeaders.forEach(header => {
                (header as HTMLElement).style.gridTemplateColumns = gridTemplate;
            });

            activityRows.forEach(row => {
                (row as HTMLElement).style.gridTemplateColumns = gridTemplate;
            });
        };

        if (extraDates.length > 0 || activityData.length > 0) {
            updateGridColumns();
        }
    }, [extraDates, activityData]);

    // Countdown timer effect (DOESN'T trigger auto-refresh)
    useEffect(() => {
        countdownIntervalRef.current = setInterval(() => {
            setTimeUntilRefresh(prev => {
                if (prev <= 1) {
                    // Auto-refresh when timer hits 0
                    if (!isManualRefreshRef.current) {
                        handleRefresh(false); // Auto refresh
                    }
                    return 3600; // Reset to 1 hour
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, []);

    // Auto-refresh effect (every hour)
    useEffect(() => {
        autoRefreshIntervalRef.current = setInterval(() => {
            if (!isManualRefreshRef.current) {
                handleRefresh(false); // Auto refresh
            }
        }, 60 * 60 * 1000); // 1 hour

        return () => {
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, []);

    // Reset manual refresh flag when loading completes
    useEffect(() => {
        if (!loading && isManualRefresh) {
            setIsManualRefresh(false);
            isManualRefreshRef.current = false;
        }
    }, [loading, isManualRefresh]);

    // Manual refresh handler - WON'T affect countdown
    const handleManualRefresh = () => {
        handleRefresh(true); // Manual refresh
        // Timer continues counting down independently
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14l5-5 5 5z" />
                    </svg>
                );
            case 'down':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z" />
                    </svg>
                );
            default:
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14" />
                    </svg>
                );
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'up': return 'trend-up';
            case 'down': return 'trend-down';
            default: return 'trend-same';
        }
    };

    const formatDate = (value: string | Date) => {
        return new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getCommitCountForDate = (date: string, repo: RepoActivity) => {
        return repo.extra[date] || 0;
    };

    if (loading) {
        return (
            <div className={`repo-activity-section ${className}`}>
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Loading repository activity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`repo-activity-section ${className}`}>
            {/* Header */}
            <div className="section-header">
                <h3>
                    Daily Repository Activity
                    <Tooltip content="Compare yesterday's vs today's commit activity across all repositories">
                        <span className="tooltip-icon">ℹ️</span>
                    </Tooltip>
                </h3>

                <div className="date-section">
                    <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 4h-2V2h-2v2H9V2H7v2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zm0 16H5V8h14v12z"></path>
                            <path d="M11 10H7v2h4v-2zm6 0h-4v2h4v-2zm-6 4H7v2h4v-2zm6 0h-4v2h4v-2z"></path>
                        </svg>
                        Add Date
                    </button>

                    <div className="date-range">
                        <Tooltip content="Full day commit count from midnight to midnight">
                            <div className="date-value">
                                {formatDate(dates.yesterday)}
                            </div>
                        </Tooltip>
                        vs
                        <Tooltip content="Today's commits so far (updates in real-time)">
                            <div className="date-value">
                                {formatDate(dates.today)}
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Activity Grid */}
            <div className="activity-grid">
                {/* Header Row */}
                <div className="activity-header">
                    <Tooltip content="Repository name">
                        <div className="repo-column">
                            Repository
                        </div>
                    </Tooltip>
                    <Tooltip content="Number of commits made yesterday">
                        <div className="commit-column">
                            Yesterday
                        </div>
                    </Tooltip>
                    <Tooltip content="Number of commits made today">
                        <div className="commit-column">
                            Today
                        </div>
                    </Tooltip>

                    {extraDates.map(d => (
                        <div key={d} className="commit-column date-header" title={`Commits on ${d}`}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, opacity: 0.8, color: '#646cff' }}>Extra Date</div>
                            <div
                                style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    background: "linear-gradient(135deg, #646cff, #00d4aa)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                }}
                            >
                                {formatDate(d)}
                            </div>
                        </div>
                    ))}

                    <Tooltip content="Difference between today and yesterday's commits">
                        <div className="commit-column">
                            Change
                        </div>
                    </Tooltip>
                </div>

                {/* Data Rows */}
                {activityData.length > 0 ? (
                    activityData.map((repo) => (
                        <div key={repo.name} className="activity-row">
                            <Tooltip content={`Repository: ${repo.name}`}>
                                <div className="repo-column repo-name" title={repo.name}>
                                    {repo.name}
                                </div>
                            </Tooltip>

                            <Tooltip content={`${repo.yesterdayCommits} commits made yesterday`}>
                                <div className="commit-column" title={`${repo.yesterdayCommits} commits`}>
                                    {repo.yesterdayCommits}
                                </div>
                            </Tooltip>
                            <Tooltip content={`${repo.todayCommits} commits made today`}>
                                <div className="commit-column" >
                                    {repo.todayCommits}
                                </div>
                            </Tooltip>

                            {extraDates.map(d => (
                                <Tooltip key={d} content={`${getCommitCountForDate(d, repo)} commits on ${formatDate(d)}`}>
                                    <div className="commit-column date-column">
                                        {getCommitCountForDate(d, repo)}
                                    </div>
                                </Tooltip>
                            ))}

                            <Tooltip content={`${repo.trend === 'up' ? 'Increased' : repo.trend === 'down' ? 'Decreased' : 'No change'} by ${repo.change} commits`}>
                                <div className={`change-column ${getTrendColor(repo.trend)}`}>
                                    {getTrendIcon(repo.trend)}
                                    {repo.change > 0 ? `${repo.change}` : ''}
                                </div>
                            </Tooltip>
                        </div>
                    ))
                ) : (
                    <div className="empty-state" title="No commits were made in any repositories during the last 2 days">
                        <p>No repository activity found for the selected period.</p>
                        <button onClick={handleManualRefresh}>Retry</button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="activity-footer">
                {rateLimited && (
                    <div className="rate-limit-warning">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <span className="rate-limit-text">
                            {rateLimitMessage || 'Rate limit exceeded. Showing cached data.'}
                        </span>
                    </div>
                )}
                <Tooltip content="Data is automatically fetched from GitHub API">
                    <div className="footer-info">
                        <span className="update-status">
                            {isManualRefresh ? 'Refreshing data...' : rateLimited ? 'Using cached data' : 'Updates automatically'}
                        </span>
                        {!rateLimited && (
                            <span className="countdown-timer">
                                • Next auto-refresh in: <span className="time-remaining">{formatTime(timeUntilRefresh)}</span>
                            </span>
                        )}
                    </div>
                </Tooltip>

                <Tooltip content="Manual refresh won't reset the auto-refresh timer">
                    <button
                        onClick={handleManualRefresh}
                        className="refresh-btn"
                        disabled={isManualRefresh}
                    >
                        {isManualRefresh ? (
                            <>
                                <Loader2 className="refresh-icon loading" />
                                <span className="refresh-text">Refreshing...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="refresh-icon" />
                                <span className="refresh-text">Refresh Now</span>
                            </>
                        )}
                    </button>
                </Tooltip>
            </div>

            <DateModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={(date) => {
                    setExtraDates(prev => [...prev, date]);
                    setModalOpen(false);
                }}
            />
        </div>
    );
}