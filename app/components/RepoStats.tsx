'use client';

import { useState } from 'react';
import { RepoStat, ChartData } from '@/types';

interface RepoStatsProps {
    stats: RepoStat[];
    username: string;
}

export default function RepoStats({ stats, username }: RepoStatsProps) {
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<string>('name');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    const toggleExpand = (repoName: string) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(repoName)) {
            newExpanded.delete(repoName);
        } else {
            newExpanded.add(repoName);
        }
        setExpandedCards(newExpanded);
    };

    const getCurrentYearActivity = (stat: RepoStat) => {
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(`${currentYear}-01-01T00:00:00Z`);
        const lastCommit = stat.lastCommitDate ? new Date(stat.lastCommitDate) : null;

        if (!lastCommit || lastCommit < yearStart) {
            return 'inactive';
        }
        return 'active';
    };


    const getRepoInitials = (repoName: string) => {
        if (!repoName) return '??';

        const words = repoName
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .split(' ')
            .filter(word => word.length > 0);

        if (words.length >= 2) {
            return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
        } else {
            return repoName.substring(0, 2).toUpperCase();
        }
    };

    const getRepositoryAge = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
        return `${Math.floor(diffDays / 365)} years`;
    };

    const getActivityLevel = (totalCommits: number, streak: number) => {
        const score = totalCommits + (streak * 2);
        if (score > 50) return 'very-high';
        if (score > 25) return 'high';
        if (score > 10) return 'medium';
        return 'low';
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const sortedStats = [...stats].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'commits':
                return b.totalCommits - a.totalCommits;
            case 'recent':
                return new Date(b.lastCommitDate || b.createdAt).getTime() - new Date(a.lastCommitDate || a.createdAt).getTime();
            case 'streak':
                return b.maxConsecutiveDays - a.maxConsecutiveDays;
            default:
                return 0;
        }
    });

    return (
        <div className="repo-stats">
            <div className="section-header">
                <h3 className="text-2xl font-bold">Repository Insights</h3>
                <div className="stats-summary">
                    <span className="summary-item">
                        <span className="summary-count">{stats.length}</span>
                        <span className="summary-label">Active Repos</span>
                    </span>
                    <span className="summary-item">
                        <span className="summary-count">{stats.reduce((sum, stat) => sum + stat.totalCommits, 0)}</span>
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

            <div className={`stats-grid ${view === 'list' ? '!grid-cols-1' : ''}`}>
                {sortedStats.map((stat, index) => (
                    <div
                        key={index}
                        className={`stat-card ${expandedCards.has(stat.name) ? 'expanded' : ''}`}
                    >
                        <div className="card-header">
                            <div className="repo-main-info">
                                <div
                                    className="repo-avatar"
                                    style={{
                                        background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}40)`,
                                        borderColor: stat.color
                                    }}
                                >
                                    <span style={{ color: stat.color }}>{getRepoInitials(stat.name)}</span>
                                </div>
                                <div className="repo-title">
                                    <h4 className="repo-name" style={{ color: stat.color }}>{stat.name}</h4>
                                    <div className="repo-meta" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                            <span className="repo-age" title="Repository age">
                                                {getRepositoryAge(stat.createdAt)} old
                                            </span>
                                            <span className="repo-age" title="Created date">
                                                {formatDate(stat.createdAt)}
                                            </span>
                                        </div>
                                        {stat.language && (
                                            <span
                                                className="repo-language"
                                                style={{ background: `${stat.color}20`, color: stat.color, padding: '2px 6px', borderRadius: '4px' }}
                                            >
                                                {stat.language}
                                            </span>
                                        )}
                                    </div>

                                </div>
                            </div>
                            <div className="repo-actions">
                                <button className="action-btn favorite-btn" title="Add to favorites">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 1.5l2.5 5 5.5.5-4 4 1 5.5-5-3-5 3 1-5.5-4-4 5.5-.5z" />
                                    </svg>
                                </button>
                                <button
                                    className="action-btn expand-btn"
                                    title={expandedCards.has(stat.name) ? 'Hide details' : 'Show details'}
                                    onClick={() => toggleExpand(stat.name)}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                        className={expandedCards.has(stat.name) ? 'expanded' : ''}
                                    >
                                        <path d="M4 6l4 4 4-4z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="card-stats">
                            <div className="stat-pill primary">
                                <span className="stat-value">{stat.totalCommits}</span>
                                <span className="stat-label">Total</span>
                            </div>
                            <div className={`stat-pill ${stat.maxCommits >= 5 ? 'highlight' : 'secondary'}`}>
                                <span className="stat-value">{stat.maxCommits}</span>
                                <span className="stat-label">Peak</span>
                                <span className="detail-value">{formatDate(stat.maxCommitsDate)}</span>

                            </div>
                            <div className={`stat-pill ${stat.maxConsecutiveDays >= 7 ? 'success' : 'secondary'}`}>
                                <span className="stat-value">{stat.maxConsecutiveDays}</span>
                                <span className="stat-label">Streak</span>
                            </div>
                        </div>

                        <div className={`card-details ${expandedCards.has(stat.name) ? 'expanded' : 'collapsed'}`}>
                            <div className="basic-details">
                                {stat.lastCommitDate && (
                                    <div className="detail-item">
                                        <div className="detail-content">
                                            <span className="detail-label">Last Commit</span>
                                            <span className="detail-value">{formatDate(stat.lastCommitDate)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="extended-details">
                                {stat.description && (
                                    <div className="detail-item description">
                                        <div className="detail-content">
                                            <span className="detail-label">Description</span>
                                            <span className="detail-value">{stat.description}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="activity-meter">
                                    <div className="meter-label">Activity Level</div>
                                    <div className="meter-bar">
                                        {/* <div
                                            className={`meter-fill ${getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}`}
                                            style={{ width: `${Math.min((stat.totalCommits / 50) * 100, 100)}%` }}
                                        >
                                            <span className="meter-text">
                                                {getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}
                                            </span>
                                        </div> */}

                                        {(() => {
                                            const activityScore = Math.min(
                                                (stat.totalCommits + stat.maxConsecutiveDays * 2) / 70 * 100,
                                                100
                                            );
                                            return (
                                                <div
                                                    className={`meter-fill ${getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}`}
                                                    style={{ width: `${activityScore}%` }}
                                                >
                                                    <span className="meter-text">
                                                        {getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

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
                                onClick={() => window.open(`https://github.com/${username}/${stat.name}`, '_blank')}
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
    );
}