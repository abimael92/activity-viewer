// components/RepoActivitySection.tsx
'use client';

import { useState, useEffect } from 'react';
import './RepoActivitySection.css';
import Tooltip from './Tooltip';



interface RepoActivity {
    name: string;
    yesterdayCommits: number;
    todayCommits: number;
    change: number;
    trend: 'up' | 'down' | 'same';
}

interface RepoActivitySectionProps {
    className?: string;
    username?: string;
}

export function RepoActivitySection({ className = '', username = 'abimael92' }: RepoActivitySectionProps) {
    const [activityData, setActivityData] = useState<RepoActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [dates, setDates] = useState({ today: '', yesterday: '' });

    const fetchRepoCommits = async (repoName: string, since: string, until: string): Promise<number> => {
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
    };

    const fetchRepoActivity = async () => {
        if (!username) return;

        setLoading(true);

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

            // Fetch commit counts for each repo for today and yesterday
            const activityPromises = repos.map(async (repo: { name: string }) => {
                const todayCommits = await fetchRepoCommits(repo.name, todayStart.toISOString(), todayEnd.toISOString());
                const yesterdayCommits = await fetchRepoCommits(repo.name, yesterdayStart.toISOString(), yesterdayEnd.toISOString());

                const change = todayCommits - yesterdayCommits;
                const trend: 'up' | 'down' | 'same' = change > 0 ? 'up' : change < 0 ? 'down' : 'same';


                return {
                    name: repo.name,
                    yesterdayCommits,
                    todayCommits,
                    change: Math.abs(change),
                    trend
                };
            });

            const activities = await Promise.all(activityPromises);

            // Filter out repos with no activity in both days and sort by today's activity
            const filteredActivities = activities
                .filter(repo => repo.yesterdayCommits > 0 || repo.todayCommits > 0)
                .sort((a, b) => b.todayCommits - a.todayCommits);

            setActivityData(filteredActivities);
        } catch (error) {
            console.error('Error fetching repo activity:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRepoActivity();

        // Refresh every hour
        const interval = setInterval(fetchRepoActivity, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [username]);

    const getTrendIcon = (trend: string) => {
        const iconStyle = {
            width: '32',
            height: '32',
            display: 'inline-block'
        };
        switch (trend) {
            case 'up':
                return (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14l5-5 5 5z" />
                    </svg>
                );
            case 'down':
                return (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z" />
                    </svg>
                );
            default:
                return (
                    <svg style={iconStyle} viewBox="0 0 24 24">
                        <path d="M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" />
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
                    <span className="tooltip-icon" title="Compare yesterday's vs today's commit activity across all repositories">
                        ℹ️
                    </span>
                </h3>

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

            {/* Activity Grid */}
            <div className="activity-grid">
                {/* Header Row */}
                <div className="activity-header">
                    <div className="repo-column"
                        title="Repository name">
                        Repository
                    </div>
                    <div className="commit-column"
                        title="Number of commits made yesterday">
                        Yesterday
                    </div>
                    <div className="commit-column"
                        title="Number of commits made today">
                        Today
                    </div>
                    <div className="change-column"
                        title="Difference between today and yesterday's commits">
                        Change
                    </div>
                </div>

                {/* 
                <div className="tooltip-wrapper">
                    <span className="repo-name">{repo.name}</span>
                    <div className="tooltip">
                        <div>Commit Date: {formatDate(repo.lastCommit)}</div>
                        <div>Days since: {repo.daysWithoutCommits} days</div>
                        <div>Branch: main</div>
                    </div>
                </div> 
                */}

                {/* Data Rows */}
                {activityData.length > 0 ? (
                    activityData.map((repo) => (
                        <div
                            key={repo.name}
                            className="activity-row"
                        >
                            <div className="activity-row-content">
                                <div className="tooltip-wrapper">
                                    <div className="repo-column repo-name">
                                        {repo.name}
                                    </div>
                                    <div className="tooltip">
                                        <div>{repo.name}</div>
                                    </div>
                                </div>

                                <div className="commit-column">
                                    {repo.yesterdayCommits}
                                </div>
                                <div className="commit-column">
                                    {repo.todayCommits}
                                </div>
                                <div className={`change-column ${getTrendColor(repo.trend)}`}
                                    title={`${repo.trend === 'up' ? 'Increased' : repo.trend === 'down' ? 'Decreased' : 'No change'} by ${repo.change} commits`}>
                                    {getTrendIcon(repo.trend)} {repo.change > 0 ? `${repo.change}` : ''}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state"
                        title="No commits were made in any repositories during the last 2 days">
                        <p>No repository activity found for the selected period.</p>
                        <button onClick={fetchRepoActivity}>Retry</button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="activity-footer">
                <p title="Data is automatically fetched from GitHub API every hour">
                    Updates automatically • Data refreshes hourly
                </p>
            </div>
        </div>
    );
}