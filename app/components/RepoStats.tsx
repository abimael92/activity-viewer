'use client';

import { useState } from 'react';
import { RepoStat } from '@/types';

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
        newExpanded.has(repoName) ? newExpanded.delete(repoName) : newExpanded.add(repoName);
        setExpandedCards(newExpanded);
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
        const created = new Date(createdAt);
        const diffDays = Math.ceil((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
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
                    >Grid</button>
                    <button
                        className={`view-btn ${view === 'list' ? 'active' : ''}`}
                        onClick={() => setView('list')}
                    >List</button>
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
                {sortedStats.slice(0, 10).map((stat) => (
                    <div key={stat.name} className={`stat-card ${expandedCards.has(stat.name) ? 'expanded' : ''}`}>
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
                                    <div className="repo-meta">
                                        <span>{getRepositoryAge(stat.createdAt)} old</span>
                                        <span>{formatDate(stat.createdAt)}</span>
                                        {stat.language && (
                                            <span
                                                className="repo-language"
                                                style={{ background: `${stat.color}20`, color: stat.color }}
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
                                        <span className="detail-value">{formatDate(stat.lastCommitDate)}</span>
                                    </div>
                                )}
                                <div className="activity-meter">
                                    <div className="meter-bar">
                                        <div
                                            className={`meter-fill ${getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays)}`}
                                            style={{
                                                width: `${Math.min((stat.totalCommits + stat.maxConsecutiveDays * 2) / 70 * 100, 100)}%`
                                            }}
                                        />
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

                                {stat.lastDayCommits !== undefined && (
                                    <div className="last-day-commits">
                                        <span className="trend-label">Last Day Commits:</span>{' '}
                                        <span className="trend-value">{stat.lastDayCommits}</span>
                                    </div>
                                )}
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
