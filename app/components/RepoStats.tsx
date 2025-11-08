'use client';

import { useState } from 'react';
import { RepoStat } from '@/types';

interface RepoStatsProps {
    stats: RepoStat[];
    loading: boolean,
    username: string;
}

export default function RepoStats({ stats, loading, username }: RepoStatsProps) {
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<string>('name');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [visibleCount, setVisibleCount] = useState<number>(6);

    console.log('this are allthe stats: ', stats);

    const [now] = useState(() => Date.now());

    const toggleExpand = (repoName: string) => {
        const newExpanded = new Set(expandedCards);
        newExpanded.has(repoName) ? newExpanded.delete(repoName) : newExpanded.add(repoName);
        setExpandedCards(newExpanded);
    };

    const showMore = () => {
        setVisibleCount(prev => Math.min(prev + 2, 12));
    };

    const showLess = () => {
        setVisibleCount(3);
    };

    const getRepoInitials = (repoName: string) => {
        const words = repoName
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .split(' ')
            .filter(Boolean);
        return words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : repoName.substring(0, 2).toUpperCase();
    };

    const getRepositoryAge = (createdAt: string) => {
        if (!now) return '...';
        const created = new Date(createdAt);
        const diffDays = Math.ceil((now - created.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
        return `${Math.floor(diffDays / 365)} years`;
    };

    const getActivityLevel = (totalCommits: number, streak: number) => {
        const score = totalCommits + streak * 2;
        if (score > 50) return 'very-high';
        if (score > 25) return 'high';
        if (score > 10) return 'medium';
        return 'low';
    };

    const formatDate = (date: string | null) =>
        date
            ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A';

    const formatDateTime = (date: string | null) =>
        date
            ? new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';

    // Get recent commits from the last day
    const getRecentCommits = (stat: RepoStat) => {
        console.log('this is the statss: ', stat);

        if (!stat.lastDayCommits || !Array.isArray(stat.lastDayCommits)) return [];

        // Return all commits, no date filtering
        return stat.lastDayCommits;
    };

    const sortedStats = [...stats].sort((a, b) => {
        switch (sortBy) {
            case 'commits':
                return b.totalCommits - a.totalCommits;
            case 'recent':
                return new Date(b.lastCommitDate || b.createdAt).getTime() -
                    new Date(a.lastCommitDate || a.createdAt).getTime();
            case 'streak':
                return b.maxConsecutiveDays - a.maxConsecutiveDays;
            default:
                return a.name.localeCompare(b.name);
        }
    });

    const visibleStats = sortedStats.slice(0, visibleCount);
    const canShowMore = visibleCount < Math.min(stats.length, 10);
    const canShowLess = visibleCount > 3;

    return (
        <div className="repo-stats-container">
            {/* Add loading state at the beginning */}
            {loading && (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Loading repository insights...</p>
                </div>
            )}

            {/* Wrap existing content in a conditional */}
            {!loading && (
                <>
                    <div className="repo-stats">
                        <div className="section-header">
                            <h3 className="text-2xl font-bold">Repository Insights</h3>
                            <div className="stats-summary">
                                <span className="summary-item">
                                    <span className="summary-count">{stats.length}</span>
                                    <span className="summary-label">Active Repos</span>
                                </span>
                                <span className="summary-item">
                                    <span className="summary-count">
                                        {stats.reduce((sum, s) => sum + s.totalCommits, 0)}
                                    </span>
                                    <span className="summary-label">Total Commits</span>
                                </span>
                            </div>
                        </div>

                        <div className="stats-controls">
                            <div className="view-toggle">
                                <button
                                    className={`view-btn ${view === 'grid' ? 'active' : ''}`}
                                    onClick={() => setView('grid')}
                                >

                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <rect x="1" y="1" width="4" height="4" rx="1" />
                                        <rect x="1" y="7" width="4" height="4" rx="1" />
                                        <rect x="7" y="1" width="4" height="4" rx="1" />
                                        <rect x="7" y="7" width="4" height="4" rx="1" />
                                        <rect x="13" y="1" width="2" height="4" rx="1" />
                                        <rect x="13" y="7" width="2" height="4" rx="1" />
                                    </svg>
                                    Grid
                                </button>
                                <button
                                    className={`view-btn ${view === 'list' ? 'active' : ''}`}
                                    onClick={() => setView('list')}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <rect x="1" y="1" width="14" height="2" rx="1" />
                                        <rect x="1" y="7" width="14" height="2" rx="1" />
                                        <rect x="1" y="13" width="14" height="2" rx="1" />
                                    </svg>
                                    List
                                </button>
                            </div>
                            <div className="sort-controls">
                                <select
                                    className="sort-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="name">Sort by Name</option>
                                    <option value="commits">Sort by Commits</option>
                                    <option value="recent">Sort by Recent</option>
                                    <option value="streak">Sort by Streak</option>
                                </select>
                            </div>
                        </div>

                        <div className={`stats-grid grid grid-cols-1 sm:grid-cols-2 gap-6`}>

                            {visibleStats.map((stat) => (
                                <div key={stat.name} className={`stat-card ${expandedCards.has(stat.name) ? 'expanded' : ''}`}>
                                    <div className="card-header">
                                        <div className="repo-main-info">
                                            <div
                                                className="repo-avatar"
                                                style={{
                                                    background: `linear-gradient(135deg, ${stat.color}50, ${stat.color}40)`,
                                                    borderColor: stat.color
                                                }}
                                            >
                                                <span style={{ color: stat.color }}>{getRepoInitials(stat.name)}</span>
                                            </div>
                                            <div className="repo-title">
                                                <h4 className="repo-name" style={{ color: stat.color }}>{stat.name}</h4>
                                                <div className="repo-meta">
                                                    <div className="repo-dates">
                                                        <span>{formatDate(stat.createdAt)}</span>
                                                        <span>{getRepositoryAge(stat.createdAt)} old</span>
                                                    </div>
                                                    {stat.language && (
                                                        <span
                                                            className="repo-language"
                                                            style={{
                                                                background: `${stat.color}20`,
                                                                color: stat.color,
                                                                border: `1px solid ${stat.color}`,
                                                            }}
                                                        >
                                                            {stat.language}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            className="expand-btn"
                                            onClick={() => toggleExpand(stat.name)}
                                        >
                                            {expandedCards.has(stat.name) ? '−' : '+'}
                                        </button>
                                    </div>

                                    <div className="card-stats">
                                        <div className="stat-pill primary">
                                            <span className="stat-value">{stat.totalCommits}</span>
                                            <span className="stat-label">Total</span>
                                        </div>
                                        <div className="stat-pill secondary">
                                            <span className="stat-value">{stat.maxCommits}</span>
                                            <span className="stat-label">Peak</span>
                                            <span className="detail-value">{formatDate(stat.maxCommitsDate)}</span>
                                        </div>
                                        <div className="stat-pill success">
                                            <span className="stat-value">{stat.maxConsecutiveDays}</span>
                                            <span className="stat-label">Streak</span>
                                        </div>
                                    </div>

                                    {expandedCards.has(stat.name) && (
                                        <div className="card-details">
                                            {stat.description && (
                                                <div className="detail-item">
                                                    <span className="detail-label">Description</span>
                                                    <span className="detail-value">{stat.description}</span>
                                                </div>
                                            )}
                                            {stat.lastCommitDate && (
                                                <div className="detail-item">
                                                    <span className="detail-label">Last Commit</span>
                                                    <span className="detail-value">{formatDateTime(stat.lastCommitDate)}</span>
                                                </div>
                                            )}

                                            {/* Recent Activity Section */}
                                            <div className="recent-activity-section">
                                                <h5 className="activity-title">Recent Activity</h5>
                                                {getRecentCommits(stat).length > 0 ? (
                                                    <div className="commit-list">
                                                        {getRecentCommits(stat).map((commit, index) => (
                                                            <div key={index} className="commit-item">
                                                                <div className="commit-message">
                                                                    <span className="commit-hash">#{commit.hash?.substring(0, 7) || 'N/A'}</span>
                                                                    <span className="commit-text">{commit.message}</span>
                                                                </div>
                                                                <div className="commit-meta">
                                                                    <span className="commit-date">{formatDateTime(commit.date)}</span>
                                                                    {commit.author && (
                                                                        <span className="commit-author">by {commit.author}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="no-activity">
                                                        <span className="no-activity-text">No commits in the last 24 hours</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="activity-meter">
                                                <div className="meter-label">Activity Level</div>
                                                <div className="meter-bar">
                                                    <div
                                                        className={`meter-fill ${getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}`}
                                                        style={{
                                                            width: `${Math.min((stat.totalCommits / 50) * 100, 100)}%`
                                                        }}
                                                    >
                                                        {/* Add this span for the text label */}
                                                        <span className="meter-text">
                                                            {getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays).replace('-', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="card-footer">
                                        <div className="commit-trend">
                                            <span className="trend-label">Recent Activity</span>
                                            <div className="trend-sparkline">
                                                <div className="sparkline-bar" style={{ height: '60%' }}></div>
                                                <div className="sparkline-bar" style={{ height: '80%' }}></div>
                                                <div className="sparkline-bar" style={{ height: '45%' }}></div>
                                                <div className="sparkline-bar" style={{ height: '90%' }}></div>
                                                <div className="sparkline-bar" style={{ height: '70%' }}></div>
                                                <div className="sparkline-bar" style={{ height: '85%' }}></div>
                                                <div className="sparkline-bar" style={{ height: '55%' }}></div>
                                            </div>
                                        </div>

                                        <button
                                            className="view-repo-btn"
                                            onClick={() =>
                                                window.open(`https://github.com/${username}/${stat.name}`, '_blank')
                                            }
                                        >
                                            View Repo
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M10 2h4v4l-1-1-3 3-1-1 3-3-1-1zM6 10L3 7l1-1 3 3-1 1z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Show More/Less Controls */}
                        <div className="show-more-controls" >
                            {canShowMore && (
                                <button className="show-more-btn" onClick={showMore}>
                                    Show More (2)
                                </button>
                            )}
                            {canShowLess && (
                                <button className="show-less-btn" onClick={showLess}>
                                    Show Less
                                </button>
                            )}
                        </div>

                        <div className="stats-footer">
                            <div className="export-controls">
                                <button className="export-btn">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 1v8m0 0l2-2m-2 2L6 7m6 4v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3" />
                                    </svg>
                                    Export Data
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}