// components/RepoActivitySection.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react'; // Add useRef
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
    username?: string;
}

export function RepoActivitySection({ className = '', username = 'abimael92' }: RepoActivitySectionProps) {
    const [activityData, setActivityData] = useState<RepoActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [dates, setDates] = useState({ today: '', yesterday: '' });
    const [extraDates, setExtraDates] = useState<string[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [timeUntilRefresh, setTimeUntilRefresh] = useState(3600); // 1 hour in seconds
    const [isManualRefresh, setIsManualRefresh] = useState(false);

    // Use refs to track if refresh is manual or auto
    const isManualRefreshRef = useRef(false);
    const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const activityDataRef = useRef(activityData);

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const fetchRepoCommits = useCallback(async (repoName: string, since: string, until: string): Promise<number> => {
        try {
            let allCommits: unknown[] = [];
            let page = 1;

            while (page <= 3) {
                const response = await fetch(
                    `https://api.github.com/repos/${username}/${repoName}/commits?since=${since}&until=${until}&per_page=100&page=${page}`,
                    {
                        headers: {
                            'Authorization': `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (!response.ok) break;

                const commits = await response.json();
                if (commits.length === 0) break;

                allCommits = allCommits.concat(commits);
                page++;
            }

            return allCommits.length;
        } catch (error) {
            console.error(`Error fetching commits for ${repoName}:`, error);
            return 0;
        }
    }, [username]);

    const getExtraDateRanges = useCallback(() =>
        extraDates.map(d => {
            const day = new Date(d);
            const start = new Date(day); start.setHours(0, 0, 0, 0);
            const end = new Date(day); end.setHours(23, 59, 59, 999);
            return { date: d, start: start.toISOString(), end: end.toISOString() };
        }), [extraDates]);

    const fetchRepoActivity = useCallback(async (refreshExtraDatesOnly = false, isManual = false) => {
        if (isManual) {
            setIsManualRefresh(true);
            isManualRefreshRef.current = true;
        }

        if (!refreshExtraDatesOnly) {
            setLoading(true);
        }

        // Calculate dates
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Set yesterday to start of day (00:00:00)
        const yesterdayStart = new Date(yesterday);
        yesterdayStart.setHours(0, 0, 0, 0);

        // Set yesterday to end of day (23:59:59)
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        // Set today to start of day (00:00:00)
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        // Set today to end of day (23:59:59)
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        setDates({
            today: today.toISOString().split('T')[0],
            yesterday: yesterday.toISOString().split('T')[0]
        });

        try {
            // Fetch user's repositories
            const reposResponse = await fetch(
                `https://api.github.com/users/${username}/repos?sort=updated&per_page=20`,
                {
                    headers: {
                        'Authorization': `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!reposResponse.ok) throw new Error('Failed to fetch repositories');

            const repos = await reposResponse.json();

            // Fetch commit counts for each repo
            const activityPromises = repos.map(async (repo: { name: string }) => {
                let todayCommits, yesterdayCommits;

                if (!refreshExtraDatesOnly) {
                    // Only fetch today and yesterday data on initial load
                    todayCommits = await fetchRepoCommits(repo.name, todayStart.toISOString(), todayEnd.toISOString());
                    yesterdayCommits = await fetchRepoCommits(repo.name, yesterdayStart.toISOString(), yesterdayEnd.toISOString());
                } else {
                    // When refreshing extra dates only, use existing data
                    const existingRepo = activityDataRef.current.find(r => r.name === repo.name);

                    todayCommits = existingRepo?.todayCommits || 0;
                    yesterdayCommits = existingRepo?.yesterdayCommits || 0;
                }

                const change = todayCommits - yesterdayCommits;
                const trend: 'up' | 'down' | 'same' = change > 0 ? 'up' : change < 0 ? 'down' : 'same';

                // Fetch commit count for each extra date
                const extra: Record<string, number> = {};
                const extraDateRanges = getExtraDateRanges();

                for (const range of extraDateRanges) {
                    const commitCount = await fetchRepoCommits(
                        repo.name,
                        range.start,
                        range.end
                    );
                    extra[range.date] = commitCount;
                }

                return {
                    name: repo.name,
                    yesterdayCommits,
                    todayCommits,
                    change: Math.abs(change),
                    trend,
                    extra
                };
            });

            // After all repos are processed
            const activities = await Promise.all(activityPromises);

            // Filter & sort
            const filteredActivities = activities
                .filter(repo => repo.yesterdayCommits > 0 || repo.todayCommits > 0 || Object.values(repo.extra).some((count: unknown) => Number(count) > 0))
                .sort((a, b) => b.todayCommits - a.todayCommits);

            setActivityData(filteredActivities);

        } catch (error) {
            console.error('Error fetching repo activity:', error);
        } finally {
            if (!refreshExtraDatesOnly) {
                setLoading(false);
                setIsManualRefresh(false);
                isManualRefreshRef.current = false;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, fetchRepoCommits, getExtraDateRanges]);

    // Add this useEffect to refresh extra dates data
    useEffect(() => {
        if (extraDates.length > 0 && activityData.length > 0) {
            fetchRepoActivity(true, false); // Add this line
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
                        fetchRepoActivity(false, false); // Auto refresh
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
    }, [fetchRepoActivity]);

    // Auto-refresh effect (every hour)
    useEffect(() => {
        autoRefreshIntervalRef.current = setInterval(() => {
            if (!isManualRefreshRef.current) {
                fetchRepoActivity(false, false); // Auto refresh
            }
        }, 60 * 60 * 1000); // 1 hour

        return () => {
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, [fetchRepoActivity]);

    // Initial fetch
    useEffect(() => {
        fetchRepoActivity(false, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    useEffect(() => {
        activityDataRef.current = activityData;
    }, [activityData]);

    // Manual refresh handler - WON'T affect countdown
    const handleManualRefresh = useCallback(() => {
        fetchRepoActivity(false, true); // Manual refresh
        // Timer continues counting down independently
    }, [fetchRepoActivity]);

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
                        <span className="tooltip-icon" >
                            ℹ️
                        </span>
                    </Tooltip>
                </h3>

                <div className="date-section">
                    <button onClick={() => setModalOpen(true)}>Add Date</button>

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
                    <div className="repo-column" title="Repository name">
                        Repository
                    </div>
                    <div className="commit-column" title="Number of commits made yesterday">
                        Yesterday
                    </div>
                    <div className="commit-column" title="Number of commits made today">
                        Today
                    </div>

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
                <Tooltip content="Data is automatically fetched from GitHub API">
                    <div className="footer-info">
                        <span className="update-status">
                            {isManualRefresh ? 'Refreshing data...' : 'Updates automatically'}
                        </span>
                        <span className="countdown-timer">
                            • Next auto-refresh in: <span className="time-remaining">{formatTime(timeUntilRefresh)}</span>
                        </span>
                    </div>
                </Tooltip>

                <Tooltip content="Manual refresh won't reset the auto-refresh timer">
                    <button
                        onClick={handleManualRefresh}
                        className="refresh-btn"
                        disabled={isManualRefresh}
                    >
                        {isManualRefresh ? 'Refreshing...' : 'Refresh Now'}
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