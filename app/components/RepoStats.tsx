'use client';

import { useState, useEffect } from 'react';
import { RepoStat } from '@/types';

interface RepoStatsProps {
    stats: RepoStat[];
    loading: boolean,
    username: string;
}

export default function RepoStats({ stats, loading, username }: RepoStatsProps) {
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<string>('name');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [visibleCount, setVisibleCount] = useState<number>(6);
    const [isMobile, setIsMobile] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-switch to list view on mobile for better UX
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            // Switch to list view if mobile and currently in grid view
            if (mobile && view === 'grid') {
                setView('list');
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, [view]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeTooltip) {
                setActiveTooltip(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeTooltip]);

    const toggleTooltip = (tooltipId: string) => {
        setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId);
    };

    // console.log('this are all the stats: ', stats);

    const [now] = useState(() => Date.now());

    const toggleExpand = (repoName: string) => {
        const newExpanded = new Set(expandedCards);
        newExpanded[newExpanded.has(repoName) ? 'delete' : 'add'](repoName);
        setExpandedCards(newExpanded);
    };

    const showMore = () => {
        setVisibleCount(prev => Math.min(prev + (isMobile ? 1 : 2), stats.length));
    };

    const showLess = () => {
        setVisibleCount(isMobile ? 3 : 6);
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
        if (diffDays < 30) return `${diffDays}d`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
        return `${Math.floor(diffDays / 365)}y`;
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
            ? new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: isMobile ? undefined : 'numeric'
            })
            : 'N/A';

    const formatDateTime = (date: string | null) =>
        date
            ? new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: isMobile ? undefined : '2-digit',
                minute: isMobile ? undefined : '2-digit'
            })
            : 'N/A';

    // Get recent commits from the last day
    const getRecentCommits = (stat: RepoStat) => {
        console.log('this is the stats: ', stat);

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
    const canShowMore = visibleCount < stats.length;
    const canShowLess = visibleCount > (isMobile ? 3 : 6);

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
                            <h3 className="section-title">Repository Insights</h3>
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
                            {!isMobile && (
                                <div className="view-toggle">
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
                                </div>
                            )}
                            <div className="sort-controls">
                                <select
                                    className="sort-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="recent">Recent</option>
                                    <option value="name">Name</option>
                                    <option value="commits">Commits</option>
                                    <option value="streak">Streak</option>
                                </select>
                            </div>
                        </div>

                        {view === 'grid' ? (
                            <div className={`stats-grid ${isMobile ? 'mobile-grid' : ''}`}>
                                {visibleStats.map((stat) => (
                                    <div key={stat.name} className={`stat-card ${expandedCards.has(stat.name) ? 'expanded' : ''}`}>

                                        {/* Add tooltip wrapper around the main card content */}
                                        <div className="tooltip-wrapper">
                                            <div
                                                className="card-header"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTooltip(`${stat.name}-main`);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="repo-main-info">
                                                    <div
                                                        className="repo-avatar"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${stat.color}70, ${stat.color}65)`,
                                                            borderColor: stat.color
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: '28px',
                                                                color: stat.color,
                                                                textShadow: `
                                                                -1px -1px 0 black,
                                                                1px -1px 0 black,
                                                                -1px  1px 0 black,
                                                                1px  1px 0 black
                                                                `
                                                            }}
                                                        >
                                                            {getRepoInitials(stat.name)}
                                                        </span>
                                                    </div>
                                                    <div className="repo-title">
                                                        <h4 className="repo-name" style={{ color: stat.color }}>
                                                            {isMobile ? (stat.name.length > 20 ? `${stat.name.substring(0, 20)}...` : stat.name) : stat.name}
                                                        </h4>
                                                        <div className="repo-meta">
                                                            <div className="repo-dates">
                                                                <span>{formatDate(stat.createdAt)}</span>
                                                                <span>{getRepositoryAge(stat.createdAt)} old</span>
                                                            </div>
                                                            {stat.language && (
                                                                <span
                                                                    className="repo-language"
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}35)`,
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
                                                    className={`expand-btn ${expandedCards.has(stat.name) ? 'open' : ''}`}
                                                    onClick={() => toggleExpand(stat.name)}
                                                    aria-label={expandedCards.has(stat.name) ? 'Collapse' : 'Expand'}
                                                >
                                                    <svg
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="chevron-icon"
                                                    >
                                                        <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                </button>


                                            </div>

                                            {/* Tooltip content */}
                                            {activeTooltip === `${stat.name}-main` && (
                                                <div className="tooltip active">
                                                    <div><strong>{stat.name}</strong></div>
                                                    <div>Created: {formatDate(stat.createdAt)}</div>
                                                    <div>Language: {stat.language || 'Not specified'}</div>
                                                    <div>Total Commits: {stat.totalCommits}</div>
                                                    <div>Best Streak: {stat.maxConsecutiveDays} days</div>
                                                    {stat.lastCommitDate && (<div>Last Commit: {formatDateTime(stat.lastCommitDate)}</div>)}

                                                </div>
                                            )}
                                        </div>

                                        <div className="card-stats">
                                            {/* Total Commits Tooltip */}
                                            <div className="tooltip-wrapper">
                                                <div
                                                    className="stat-pill primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTooltip(`${stat.name}-total`);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <span className="stat-value">{stat.totalCommits}</span>
                                                    <span className="stat-label">Total</span>
                                                </div>
                                                {activeTooltip === `${stat.name}-total` && (
                                                    <div className="tooltip active">
                                                        <strong>Total Commits</strong>
                                                        <div>All-time commit count in this repository</div>
                                                        <div>Shows overall project activity</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Peak Commits Tooltip */}
                                            <div className="tooltip-wrapper">
                                                <div
                                                    className="stat-pill secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTooltip(`${stat.name}-peak`);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <span className="stat-value">{stat.maxCommits}</span>
                                                    <span className="stat-label">Peak</span>
                                                    {!isMobile && <span className="detail-value">{formatDate(stat.maxCommitsDate)}</span>}
                                                </div>
                                                {activeTooltip === `${stat.name}-peak` && (
                                                    <div className="tooltip active">
                                                        <strong>Peak Activity</strong>
                                                        <div>Most commits in a single day: {stat.maxCommits}</div>
                                                        {stat.maxCommitsDate && <div>Peak date: {formatDate(stat.maxCommitsDate)}</div>}
                                                        <div>Shows maximum daily productivity</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Streak Tooltip */}
                                            <div className="tooltip-wrapper">
                                                <div
                                                    className="stat-pill success"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTooltip(`${stat.name}-streak`);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <span className="stat-value">{stat.maxConsecutiveDays}</span>
                                                    <span className="stat-label">Streak</span>
                                                </div>
                                                {activeTooltip === `${stat.name}-streak` && (
                                                    <div className="tooltip active">
                                                        <strong>Best Streak</strong>
                                                        <div>Longest consecutive days with commits: {stat.maxConsecutiveDays}</div>
                                                        <div>Shows consistency and dedication</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {expandedCards.has(stat.name) && (
                                            <div className="card-details">
                                                {stat.description && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Description</span>
                                                        <span className="detail-value">
                                                            {isMobile && stat.description.length > 100
                                                                ? `${stat.description.substring(0, 100)}...`
                                                                : stat.description
                                                            }
                                                        </span>
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
                                                            {getRecentCommits(stat).slice(0, isMobile ? 2 : 4).map((commit, index) => (
                                                                <div key={index} className="commit-item">
                                                                    <div className="commit-message">
                                                                        <span className="commit-hash">#{commit.hash?.substring(0, 7) || 'N/A'}</span>
                                                                        <span className="commit-text">
                                                                            {isMobile && commit.message.length > 50
                                                                                ? `${commit.message.substring(0, 50)}...`
                                                                                : commit.message
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="commit-meta">
                                                                        <span className="commit-date">{formatDateTime(commit.date)}</span>
                                                                        {commit.author && !isMobile && (
                                                                            <span className="commit-author">by {commit.author}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="no-activity">
                                                            <span className="no-activity-text">No recent commits</span>
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
                                                <span className="trend-label">Activity</span>
                                                {!isMobile && (
                                                    <div className="trend-sparkline">
                                                        <div className="sparkline-bar" style={{ height: '60%' }}></div>
                                                        <div className="sparkline-bar" style={{ height: '80%' }}></div>
                                                        <div className="sparkline-bar" style={{ height: '45%' }}></div>
                                                        <div className="sparkline-bar" style={{ height: '90%' }}></div>
                                                        <div className="sparkline-bar" style={{ height: '70%' }}></div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                className="view-repo-btn"
                                                onClick={() =>
                                                    window.open(`https://github.com/${username}/${stat.name}`, '_blank')
                                                }
                                            >
                                                {isMobile ? 'View' : 'View Repo'}
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M10 2h4v4l-1-1-3 3-1-1 3-3-1-1zM6 10L3 7l1-1 3 3-1 1z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="stats-list">
                                {visibleStats.map((stat) => (
                                    <div key={stat.name} className={`stat-list-item ${expandedCards.has(stat.name) ? 'expanded' : ''}`}>

                                        {/* Add tooltip wrapper around the main list item content */}
                                        <div className="tooltip-wrapper">
                                            <div className="list-item-main">
                                                <div
                                                    className="list-repo-info"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTooltip(`${stat.name}-main`);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div
                                                        className="repo-avatar"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${stat.color}70, ${stat.color}65)`,
                                                            borderColor: stat.color
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: '24px',
                                                                color: stat.color,
                                                                textShadow: `
                                                                -2px -2px 0 black,
                                                                2px -2px 0 black,
                                                                -2px  2px 0 black,
                                                                2px  2px 0 black
                                                                `
                                                            }}
                                                        >
                                                            {getRepoInitials(stat.name)}
                                                        </span>
                                                    </div>
                                                    <div className="list-repo-details">
                                                        <h4 className="repo-name" style={{ color: stat.color }}>
                                                            {isMobile ? (stat.name.length > 20 ? `${stat.name.substring(0, 20)}...` : stat.name) : stat.name}
                                                        </h4>
                                                        <div className="list-repo-meta">
                                                            <span>{formatDate(stat.createdAt)}</span>
                                                            <span>{getRepositoryAge(stat.createdAt)} old</span>
                                                            {stat.language && !isMobile && (
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

                                                {/* Top-right expand button */}
                                                <button
                                                    className={`expand-btn ${expandedCards.has(stat.name) ? 'open' : ''}`}
                                                    onClick={() => toggleExpand(stat.name)}
                                                    aria-label={expandedCards.has(stat.name) ? 'Collapse' : 'Expand'}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        zIndex: 10
                                                    }}
                                                >
                                                    <svg
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="chevron-icon"
                                                    >
                                                        <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                </button>

                                                <div className="list-stats">
                                                    {/* Total Commits Tooltip */}
                                                    <div className="tooltip-wrapper">
                                                        <div
                                                            className="list-stat"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTooltip(`${stat.name}-total`);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <span className="list-stat-value">{stat.totalCommits}</span>
                                                            <span className="list-stat-label">Commits</span>
                                                        </div>
                                                        {activeTooltip === `${stat.name}-total` && (
                                                            <div className="tooltip active">
                                                                <strong>Total Commits</strong>
                                                                <div>All-time commit count in this repository</div>
                                                                <div>Shows overall project activity</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Streak Tooltip */}
                                                    <div className="tooltip-wrapper">
                                                        <div
                                                            className="list-stat"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTooltip(`${stat.name}-streak`);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <span className="list-stat-value">{stat.maxConsecutiveDays}</span>
                                                            <span className="list-stat-label">Streak</span>
                                                        </div>
                                                        {activeTooltip === `${stat.name}-streak` && (
                                                            <div className="tooltip active">
                                                                <strong>Best Streak</strong>
                                                                <div>Longest consecutive days with commits: {stat.maxConsecutiveDays}</div>
                                                                <div>Shows consistency and dedication</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Peak Tooltip */}
                                                    <div className="tooltip-wrapper">
                                                        <div
                                                            className="list-stat"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTooltip(`${stat.name}-peak`);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <span className="list-stat-value">{stat.maxCommits}</span>
                                                            <span className="list-stat-label">Peak</span>
                                                        </div>
                                                        {activeTooltip === `${stat.name}-peak` && (
                                                            <div className="tooltip active">
                                                                <strong>Peak Activity</strong>
                                                                <div>Most commits in a single day: {stat.maxCommits}</div>
                                                                {stat.maxCommitsDate && <div>Peak date: {formatDate(stat.maxCommitsDate)}</div>}
                                                                <div>Shows maximum daily productivity</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="list-actions">

                                                    <button
                                                        className="view-repo-btn"
                                                        onClick={() =>
                                                            window.open(`https://github.com/${username}/${stat.name}`, '_blank')
                                                        }
                                                    >
                                                        {isMobile ? 'View' : 'View Repo'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Tooltip content */}
                                            {activeTooltip === `${stat.name}-main` && (
                                                <div className="tooltip active">
                                                    <div><strong>{stat.name}</strong></div>
                                                    <div>Created: {formatDate(stat.createdAt)}</div>
                                                    <div>Language: {stat.language || 'Not specified'}</div>
                                                    <div>Total Commits: {stat.totalCommits}</div>
                                                    <div>Best Streak: {stat.maxConsecutiveDays} days</div>
                                                    {stat.lastCommitDate && (<div>Last Commit: {formatDateTime(stat.lastCommitDate)}</div>)}
                                                </div>
                                            )}

                                            {
                                                expandedCards.has(stat.name) && (
                                                    <div className="list-item-details">
                                                        {stat.description && (
                                                            <div className="detail-item">
                                                                <span className="detail-label">Description</span>
                                                                <span className="detail-value">
                                                                    {isMobile && stat.description.length > 100
                                                                        ? `${stat.description.substring(0, 100)}...`
                                                                        : stat.description
                                                                    }
                                                                </span>
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
                                                                    {getRecentCommits(stat).slice(0, isMobile ? 2 : 4).map((commit, index) => (
                                                                        <div key={index} className="commit-item">
                                                                            <div className="commit-message">
                                                                                <span className="commit-hash">#{commit.hash?.substring(0, 7) || 'N/A'}</span>
                                                                                <span className="commit-text">
                                                                                    {isMobile && commit.message.length > 50
                                                                                        ? `${commit.message.substring(0, 50)}...`
                                                                                        : commit.message
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <div className="commit-meta">
                                                                                <span className="commit-date">{formatDateTime(commit.date)}</span>
                                                                                {commit.author && !isMobile && (
                                                                                    <span className="commit-author">by {commit.author}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="no-activity">
                                                                    <span className="no-activity-text">No recent commits</span>
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
                                                                    <span className="meter-text">
                                                                        {getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays).replace('-', ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                ))}

                                {/* Show More/Less Controls */}
                                {(canShowMore || canShowLess) && (
                                    <div className="show-more-controls">
                                        {canShowMore && (
                                            <button className="show-more-btn" onClick={showMore}>
                                                Show More ({isMobile ? 1 : 2})
                                            </button>
                                        )}
                                        {canShowLess && (
                                            <button className="show-less-btn" onClick={showLess}>
                                                Show Less
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="stats-footer">
                                    <div className="export-controls">
                                        <button className="export-btn">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M8 1v8m0 0l2-2m-2 2L6 7m6 4v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3" />
                                            </svg>
                                            {isMobile ? 'Export' : 'Export Data'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </>
            )}
        </div>
    );
}