'use client';

import { useState, useEffect } from 'react';
import { RepoStat, DeploymentStatus, MergeStatus } from '@/types';
import Tooltip from './Tooltip';

interface RepoStatsProps {
    stats: RepoStat[];
    loading: boolean,
    username: string;
}

// ========== NEW COMPONENT: Deployment Status Card ==========
const DeploymentStatusCard: React.FC<{ deployment?: DeploymentStatus }> = ({ deployment }) => {
    if (!deployment) return null;

    return (
        <div className="deployment-status-card">
            <div className="deployment-status-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            </div>
            <div className="deployment-status-content">
                <div className="deployment-status-header">
                    <h4 className="deployment-status-title">
                        {deployment.deployed ? 'Live Deployment' : 'Not Deployed'}
                    </h4>
                    <span className={`deployment-status-badge ${deployment.deployed ? 'live' : 'offline'}`}>
                        {deployment.deployed ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>
                <div className="deployment-status-meta">
                    {deployment.deploymentType && (
                        <span className="deployment-status-platform">
                            <span>Platform:</span>
                            {deployment.deploymentType}
                        </span>
                    )}
                    {deployment.lastDeployment && (
                        <span className="deployment-status-time">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {new Date(deployment.lastDeployment).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </span>
                    )}
                </div>
            </div>
            {deployment.deployed && deployment.deploymentUrl && (
                <div className="deployment-status-actions">
                    <a
                        href={deployment.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="deployment-visit-btn"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Visit Site
                    </a>
                    <button
                        className="deployment-copy-btn"
                        onClick={() => navigator.clipboard.writeText(deployment.deploymentUrl || '')}
                        title="Copy URL"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

// ========== NEW COMPONENT: Merge Status Card ==========
const MergeStatusCard: React.FC<{ mergeStatus?: MergeStatus }> = ({ mergeStatus }) => {
    if (!mergeStatus) return null;

    return (
        <div className={`merge-status-card ${mergeStatus.lastMergeSuccess ? 'success' : 'failed'}`}>
            <div className={`merge-status-icon ${mergeStatus.lastMergeSuccess ? 'success' : 'failed'}`}>
                {mergeStatus.lastMergeSuccess ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                )}
            </div>
            <div className="merge-status-content">
                <h4 className="merge-status-title">
                    {mergeStatus.lastMergeSuccess ? 'Merge Successful' : 'Merge Failed'}
                </h4>
                {mergeStatus.lastMergeTitle && (
                    <p className="merge-status-details">
                        {mergeStatus.lastMergeTitle}
                    </p>
                )}
                <div className="merge-status-timeline">
                    {mergeStatus.lastMergeDate && (
                        <span className="merge-status-time">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {new Date(mergeStatus.lastMergeDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    )}
                    {mergeStatus.mergeFailureCount && mergeStatus.mergeFailureCount > 0 && (
                        <span className="merge-failure-count">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {mergeStatus.mergeFailureCount} failed
                        </span>
                    )}
                </div>
            </div>
            <div className="merge-status-actions">
                <button className="merge-retry-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23 4v6h-6" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Retry
                </button>
                <button className="merge-details-btn">
                    Details
                </button>
            </div>
        </div>
    );
};

// ========== NEW COMPONENT: Status Panel ==========
const RepoStatusPanel: React.FC<{ stats: RepoStat[] }> = ({ stats }) => {
    const deploymentCount = stats.filter(s => s.deployment?.deployed).length;
    const mergeSuccessCount = stats.filter(s => s.mergeStatus?.lastMergeSuccess).length;
    const mergeFailedCount = stats.filter(s => s.mergeStatus && !s.mergeStatus.lastMergeSuccess).length;
    const totalRepos = stats.length;

    return (
        <div className="repo-status-panel">
            <div className="status-panel-header">
                <h3 className="status-panel-title">Repository Status Overview</h3>
                <div className="status-panel-stats">
                    <div className="status-stat-item">
                        <span className="status-stat-value total">{totalRepos}</span>
                        <span className="status-stat-label">Total Repos</span>
                    </div>
                    <div className="status-stat-item">
                        <span className="status-stat-value deployed">{deploymentCount}</span>
                        <span className="status-stat-label">Deployed</span>
                    </div>
                    <div className="status-stat-item">
                        <span className="status-stat-value merged">{mergeSuccessCount}</span>
                        <span className="status-stat-label">Merged</span>
                    </div>
                    <div className="status-stat-item">
                        <span className="status-stat-value failed">{mergeFailedCount}</span>
                        <span className="status-stat-label">Failed</span>
                    </div>
                </div>
            </div>

            <div className="deployment-actions-toolbar">
                <div className="actions-left">
                    <button className="deployment-action-btn primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        Deploy All
                    </button>
                    <button className="deployment-action-btn secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                        </svg>
                        Refresh Status
                    </button>
                </div>
                <div className="actions-right">
                    <button className="deployment-action-btn secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        View Analytics
                    </button>
                </div>
            </div>
        </div>
    );
};

// ========== NEW COMPONENT: Enhanced Deployment Badge with Tag ==========
const EnhancedDeploymentBadge: React.FC<{ deployment?: DeploymentStatus }> = ({ deployment }) => {
    if (!deployment) return null;

    if (!deployment.deployed) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                Not Deployed
            </span>
        );
    }

    const platformColors: Record<string, string> = {
        'vercel': 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200',
        'netlify': 'bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200',
        'github-pages': 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200',
        'heroku': 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200',
        'render': 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200',
        'railway': 'bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200',
        'other': 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
    };

    const platformNames: Record<string, string> = {
        'vercel': 'Vercel',
        'netlify': 'Netlify',
        'github-pages': 'GitHub Pages',
        'heroku': 'Heroku',
        'render': 'Render',
        'railway': 'Railway',
        'other': 'Deployed'
    };

    const className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all hover:scale-105 ${platformColors[deployment.deploymentType || 'other']}`;

    // Enhanced badge with tag
    const badgeContent = (
        <span className="flex items-center gap-1">
            <span className="font-semibold">🚀</span>
            <span className="font-bold">{platformNames[deployment.deploymentType || 'other']}</span>
            <span className="ml-1 text-xs bg-white px-1.5 py-0.5 rounded-full font-bold text-green-700">
                DEPLOYED
            </span>
        </span>
    );

    if (deployment.deploymentUrl) {
        return (
            <a
                href={deployment.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${className} hover:opacity-90 hover:shadow-md transition-all duration-200`}
                title={`View live deployment on ${platformNames[deployment.deploymentType || 'other']}`}
            >
                {badgeContent}
                {deployment.deploymentType === 'vercel' && (
                    <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        ↗
                    </span>
                )}
            </a>
        );
    }

    return (
        <span className={className} title={`Deployed on ${platformNames[deployment.deploymentType || 'other']}`}>
            {badgeContent}
        </span>
    );
};

// ========== NEW COMPONENT: Enhanced Merge Badge with Date ==========
const EnhancedMergeStatusBadge: React.FC<{ mergeStatus?: MergeStatus }> = ({ mergeStatus }) => {
    if (!mergeStatus) return null;

    if (mergeStatus.lastMergeSuccess === null) {
        return (
            <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300"
                title="No recent merges detected"
            >
                <span className="font-semibold">No Merges</span>
            </span>
        );
    }

    const formatMergeDate = (date: string) => {
        const mergeDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - mergeDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return mergeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex items-center gap-2">
            <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-all hover:scale-105 ${mergeStatus.lastMergeSuccess
                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                    }`}
                title={
                    mergeStatus.lastMergeSuccess
                        ? `Last merge successful on ${mergeStatus.lastMergeDate ? new Date(mergeStatus.lastMergeDate).toLocaleDateString() : 'unknown date'}`
                        : 'Last merge failed'
                }
            >
                <span className="font-bold">{mergeStatus.lastMergeSuccess ? '✓' : '✗'}</span>
                <span className="ml-1 font-semibold">Merge</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold bg-white">
                    {mergeStatus.lastMergeSuccess ? 'SUCCESS' : 'FAILED'}
                </span>
            </span>
            {mergeStatus.lastMergeDate && (
                <span className="text-sm text-gray-600 font-medium hidden md:inline bg-gray-50 px-2 py-1 rounded">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline mr-1">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatMergeDate(mergeStatus.lastMergeDate)}
                </span>
            )}
            {mergeStatus.mergeFailureCount && mergeStatus.mergeFailureCount > 0 && !mergeStatus.lastMergeSuccess && (
                <span className="text-sm text-red-600 font-medium ml-1 hidden md:inline bg-red-50 px-2 py-1 rounded">
                    ({mergeStatus.mergeFailureCount} fail{mergeStatus.mergeFailureCount > 1 ? 's' : ''})
                </span>
            )}
        </div>
    );
};

// ========== NEW COMPONENT: Enhanced Repo Status Badges ==========
const EnhancedRepoStatusBadges: React.FC<{
    deployment?: DeploymentStatus;
    mergeStatus?: MergeStatus;
    isMobile: boolean;
}> = ({ deployment, mergeStatus, isMobile }) => {
    if (!deployment && !mergeStatus) return null;

    return (
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-3'} mt-3`}>
            {deployment && <EnhancedDeploymentBadge deployment={deployment} />}
            {mergeStatus && <EnhancedMergeStatusBadge mergeStatus={mergeStatus} />}
        </div>
    );
};

// ========== ORIGINAL COMPONENTS (keep for backward compatibility) ==========
const DeploymentBadge: React.FC<{ deployment?: DeploymentStatus }> = ({ deployment }) => {
    if (!deployment) return null;

    if (!deployment.deployed) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Not Deployed
            </span>
        );
    }

    const platformColors: Record<string, string> = {
        'vercel': 'bg-purple-100 text-purple-800 border border-purple-200',
        'netlify': 'bg-teal-100 text-teal-800 border border-teal-200',
        'github-pages': 'bg-green-100 text-green-800 border border-green-200',
        'heroku': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        'render': 'bg-blue-100 text-blue-800 border border-blue-200',
        'railway': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        'other': 'bg-gray-100 text-gray-800 border border-gray-200'
    };

    const platformNames: Record<string, string> = {
        'vercel': 'Vercel',
        'netlify': 'Netlify',
        'github-pages': 'GitHub Pages',
        'heroku': 'Heroku',
        'render': 'Render',
        'railway': 'Railway',
        'other': 'Deployed'
    };

    const className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all hover:scale-105 ${platformColors[deployment.deploymentType || 'other']}`;

    if (deployment.deploymentUrl) {
        return (
            <a
                href={deployment.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${className} hover:opacity-80`}
                title={`View live deployment on ${platformNames[deployment.deploymentType || 'other']}`}
            >
                <span className="mr-1">🚀</span>
                {platformNames[deployment.deploymentType || 'other']}
                <span className="ml-1">✓</span>
            </a>
        );
    }

    return (
        <span className={className} title={`Deployed on ${platformNames[deployment.deploymentType || 'other']}`}>
            {platformNames[deployment.deploymentType || 'other']}
        </span>
    );
};

const MergeStatusBadge: React.FC<{ mergeStatus?: MergeStatus }> = ({ mergeStatus }) => {
    if (!mergeStatus) return null;

    if (mergeStatus.lastMergeSuccess === null) {
        return (
            <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                title="No recent merges detected"
            >
                No Merges
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${mergeStatus.lastMergeSuccess
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                title={
                    mergeStatus.lastMergeSuccess
                        ? `Last merge successful on ${mergeStatus.lastMergeDate ? new Date(mergeStatus.lastMergeDate).toLocaleDateString() : 'unknown date'}`
                        : 'Last merge failed'
                }
            >
                Merge
            </span>
            {mergeStatus.lastMergeDate && (
                <span className="text-xs text-gray-500 hidden md:inline">
                    {new Date(mergeStatus.lastMergeDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}
                </span>
            )}
            {mergeStatus.mergeFailureCount && mergeStatus.mergeFailureCount > 0 && !mergeStatus.lastMergeSuccess && (
                <span className="text-xs text-red-500 ml-1 hidden md:inline">
                    ({mergeStatus.mergeFailureCount} fail{mergeStatus.mergeFailureCount > 1 ? 's' : ''})
                </span>
            )}
        </div>
    );
};

// Add a combined status component for the card header
const RepoStatusBadges: React.FC<{
    deployment?: DeploymentStatus;
    mergeStatus?: MergeStatus;
    isMobile: boolean;
}> = ({ deployment, mergeStatus, isMobile }) => {
    if (!deployment && !mergeStatus) return null;

    return (
        <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-2'} mt-2`}>
            {deployment && <DeploymentBadge deployment={deployment} />}
            {mergeStatus && <MergeStatusBadge mergeStatus={mergeStatus} />}
        </div>
    );
};


export default function RepoStats({ stats, loading, username }: RepoStatsProps) {
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<string>('name');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [visibleCount, setVisibleCount] = useState<number>(6);
    const [isMobile, setIsMobile] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [showEnhancedBadges, setShowEnhancedBadges] = useState(true); // NEW: Toggle for enhanced badges

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

    const exportData = (format: 'csv' | 'json') => {
        const exportStats = sortedStats.map(stat => ({
            Repository: stat.name,
            Language: stat.language || 'Not specified',
            'Total Commits': stat.totalCommits,
            'Best Streak': stat.maxConsecutiveDays,
            'Peak Commits': stat.maxCommits,
            'Peak Date': stat.maxCommitsDate ? formatDate(stat.maxCommitsDate) : 'N/A',
            'Last Commit': stat.lastCommitDate ? formatDateTime(stat.lastCommitDate) : 'N/A',
            'Created Date': formatDate(stat.createdAt),
            'Repository Age': getRepositoryAge(stat.createdAt),
            Description: stat.description || 'No description'
        }));

        if (format === 'csv') {
            // CSV Export
            const headers = Object.keys(exportStats[0]).join(',');
            const rows = exportStats.map(stat => Object.values(stat).map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(','));
            const csv = [headers, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Repositories_Insights-${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'json') {
            // JSON Export
            const json = JSON.stringify(exportStats, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Repositories_Insights-${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // ========== NEW: Format URL for Vercel ==========
    const formatVercelUrl = (url: string) => {
        if (!url) return '';
        // Remove protocol and www for cleaner display
        return url.replace(/^https?:\/\/(www\.)?/, '');
    };

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
                    {/* NEW: Status Panel at the top */}
                    <RepoStatusPanel stats={stats} />

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
                                {/* NEW: Enhanced badges toggle */}
                                <div className="summary-item">
                                    <button
                                        onClick={() => setShowEnhancedBadges(!showEnhancedBadges)}
                                        className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                    >
                                        {showEnhancedBadges ? 'Enhanced View' : 'Simple View'}
                                    </button>
                                </div>
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
                                    {/* NEW: Sort by deployment status */}
                                    <option value="deployed">Deployment Status</option>
                                    <option value="merge">Merge Status</option>
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

                                                        {/* ENHANCED: Use enhanced badges if enabled */}
                                                        {showEnhancedBadges ? (
                                                            <EnhancedRepoStatusBadges
                                                                deployment={stat.deployment}
                                                                mergeStatus={stat.mergeStatus}
                                                                isMobile={isMobile}
                                                            />
                                                        ) : (
                                                            <RepoStatusBadges
                                                                deployment={stat.deployment}
                                                                mergeStatus={stat.mergeStatus}
                                                                isMobile={isMobile}
                                                            />
                                                        )}

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

                                                    {/* Enhanced deployment info to tooltip */}
                                                    {stat.deployment && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <div><strong>Deployment:</strong>
                                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${stat.deployment.deployed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                    {stat.deployment.deployed ? 'DEPLOYED' : 'NOT DEPLOYED'}
                                                                </span>
                                                            </div>
                                                            {stat.deployment.deployed && stat.deployment.deploymentType && (
                                                                <div className="mt-1">
                                                                    <strong>Platform:</strong>
                                                                    <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {stat.deployment.deploymentType.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {stat.deployment.deploymentUrl && (
                                                                <div className="mt-1">
                                                                    <strong>URL:</strong>
                                                                    <div className="mt-1 bg-gray-50 p-2 rounded text-sm">
                                                                        <a
                                                                            href={stat.deployment.deploymentUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:underline break-all"
                                                                        >
                                                                            {stat.deployment.deploymentType === 'vercel'
                                                                                ? formatVercelUrl(stat.deployment.deploymentUrl)
                                                                                : stat.deployment.deploymentUrl
                                                                            }
                                                                        </a>
                                                                        {stat.deployment.deploymentType === 'vercel' && (
                                                                            <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                                                                ↗ Vercel
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {stat.deployment.lastDeployment && (
                                                                <div className="mt-1 text-sm text-gray-600">
                                                                    <strong>Last deployed:</strong> {new Date(stat.deployment.lastDeployment).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Enhanced merge info to tooltip */}
                                                    {stat.mergeStatus && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <div><strong>Last Merge:</strong>
                                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${stat.mergeStatus.lastMergeSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {stat.mergeStatus.lastMergeSuccess === null ? 'NO DATA' : stat.mergeStatus.lastMergeSuccess ? 'SUCCESSFUL' : 'FAILED'}
                                                                </span>
                                                            </div>
                                                            {stat.mergeStatus.lastMergeDate && (
                                                                <div className="mt-1">
                                                                    <strong>Date:</strong>
                                                                    <span className="ml-2 text-gray-700">
                                                                        {new Date(stat.mergeStatus.lastMergeDate).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {stat.mergeStatus.mergeFailureCount && stat.mergeStatus.mergeFailureCount > 0 && (
                                                                <div className="mt-1">
                                                                    <strong>Failures:</strong>
                                                                    <span className="ml-2 text-red-600 font-medium">
                                                                        {stat.mergeStatus.mergeFailureCount} time{stat.mergeStatus.mergeFailureCount > 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                </div>
                                            )}
                                        </div>

                                        <div className="card-stats">
                                            {/* Total Commits Tooltip */}
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

                                            {/* Peak Commits Tooltip */}
                                            <div
                                                className="stat-pill secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTooltip(`${stat.name}-peak`);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Tooltip position="bottom" content="Peak Activity: Most commits in a single day">
                                                    <span className="stat-value">{stat.maxCommits}</span>
                                                    <span className="stat-label">Peak</span>
                                                    {!isMobile && <span className="detail-value">{formatDate(stat.maxCommitsDate)}</span>}
                                                </Tooltip>
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

                                                {/* ENHANCED: Use new Deployment Status Card */}
                                                {stat.deployment && (
                                                    <DeploymentStatusCard deployment={stat.deployment} />
                                                )}

                                                {/* ENHANCED: Use new Merge Status Card */}
                                                {stat.mergeStatus && stat.mergeStatus.lastMergeSuccess !== null && (
                                                    <MergeStatusCard mergeStatus={stat.mergeStatus} />
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

                                                        {/* ENHANCED: Use enhanced badges if enabled */}
                                                        {showEnhancedBadges ? (
                                                            <EnhancedRepoStatusBadges
                                                                deployment={stat.deployment}
                                                                mergeStatus={stat.mergeStatus}
                                                                isMobile={isMobile}
                                                            />
                                                        ) : (
                                                            <RepoStatusBadges
                                                                deployment={stat.deployment}
                                                                mergeStatus={stat.mergeStatus}
                                                                isMobile={isMobile}
                                                            />
                                                        )}

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

                                                    {/* Enhanced deployment info to tooltip */}
                                                    {stat.deployment && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <div><strong>Deployment:</strong>
                                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${stat.deployment.deployed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                    {stat.deployment.deployed ? 'DEPLOYED' : 'NOT DEPLOYED'}
                                                                </span>
                                                            </div>
                                                            {stat.deployment.deployed && stat.deployment.deploymentType && (
                                                                <div className="mt-1">
                                                                    <strong>Platform:</strong>
                                                                    <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {stat.deployment.deploymentType.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {stat.deployment.deploymentUrl && (
                                                                <div className="mt-1">
                                                                    <strong>URL:</strong>
                                                                    <div className="mt-1 bg-gray-50 p-2 rounded text-sm">
                                                                        <a
                                                                            href={stat.deployment.deploymentUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:underline break-all"
                                                                        >
                                                                            {stat.deployment.deploymentType === 'vercel'
                                                                                ? formatVercelUrl(stat.deployment.deploymentUrl)
                                                                                : stat.deployment.deploymentUrl
                                                                            }
                                                                        </a>
                                                                        {stat.deployment.deploymentType === 'vercel' && (
                                                                            <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                                                                ↗ Vercel
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Enhanced merge info to tooltip */}
                                                    {stat.mergeStatus && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <div><strong>Last Merge:</strong>
                                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${stat.mergeStatus.lastMergeSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {stat.mergeStatus.lastMergeSuccess === null ? 'NO DATA' : stat.mergeStatus.lastMergeSuccess ? 'SUCCESSFUL' : 'FAILED'}
                                                                </span>
                                                            </div>
                                                            {stat.mergeStatus.lastMergeDate && (
                                                                <div className="mt-1">
                                                                    <strong>Date:</strong>
                                                                    <span className="ml-2 text-gray-700">
                                                                        {new Date(stat.mergeStatus.lastMergeDate).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
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

                                                        {/* ENHANCED: Use new Deployment Status Card */}
                                                        {stat.deployment && (
                                                            <DeploymentStatusCard deployment={stat.deployment} />
                                                        )}

                                                        {/* ENHANCED: Use new Merge Status Card */}
                                                        {stat.mergeStatus && stat.mergeStatus.lastMergeSuccess !== null && (
                                                            <MergeStatusCard mergeStatus={stat.mergeStatus} />
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
                                        <button
                                            className="export-btn"
                                            onClick={() => exportData('csv')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14,2 14,8 20,8" />
                                                <path d="M16 13H8" />
                                                <path d="M16 17H8" />
                                                <polyline points="10,9 9,9 8,9" />
                                            </svg>
                                            {isMobile ? 'CSV' : 'Export CSV'}
                                        </button>
                                        <button
                                            className="export-btn"
                                            onClick={() => exportData('json')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                                                <path d="M18 14h-8" />
                                                <path d="M15 18h-5" />
                                                <path d="M10 6h8v4h-8z" />
                                            </svg>
                                            {isMobile ? 'JSON' : 'Export JSON'}
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