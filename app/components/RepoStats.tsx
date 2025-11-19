'use client';

import { useState } from 'react';
import { RepoStat } from '@/types';

interface RepoStatsProps {
    stats: RepoStat[];
    loading: boolean;
    username: string;
}

export default function RepoStats({ stats, loading, username }: RepoStatsProps) {
    const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState<number>(4);

    const [now] = useState(() => Date.now());

    const toggleExpand = (repoName: string) => {
        setExpandedRepo(expandedRepo === repoName ? null : repoName);
    };

    const showMore = () => {
        setVisibleCount(prev => prev + 4);
    };

    const showLess = () => {
        setVisibleCount(4);
        setExpandedRepo(null);
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

    const formatDate = (date: string | null | undefined) =>
        date
            ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'N/A';

    const getRecentCommits = (stat: RepoStat) => {
        if (!stat.lastDayCommits || !Array.isArray(stat.lastDayCommits)) return [];
        return stat.lastDayCommits.slice(0, 3); // Show only 3 recent commits on mobile
    };

    const getActivityColor = (level: string) => {
        switch (level) {
            case 'very-high': return 'bg-green-500';
            case 'high': return 'bg-blue-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    const visibleStats = stats.slice(0, visibleCount);
    const canShowMore = visibleCount < stats.length;
    const canShowLess = visibleCount > 4;

    if (loading) {
        return (
            <div className="min-h-64 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-600 text-sm">Loading repository insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
                    <div className="flex items-center space-x-2">
                        <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                            {stats.length} repos
                        </span>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.reduce((sum, s) => sum + s.totalCommits, 0)}
                        </div>
                        <div className="text-xs text-gray-500">Total Commits</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-2xl font-bold text-gray-900">
                            {Math.max(...stats.map(s => s.maxConsecutiveDays))}
                        </div>
                        <div className="text-xs text-gray-500">Best Streak</div>
                    </div>
                </div>
            </div>

            {/* Repository Cards */}
            <div className="space-y-3">
                {visibleStats.map((stat) => (
                    <div
                        key={stat.name}
                        className={`bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 ${expandedRepo === stat.name ? 'ring-2 ring-blue-500' : ''
                            }`}
                    >
                        {/* Card Header */}
                        <div className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1 min-w-0">
                                    <div
                                        className="flex-shrink-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-sm"
                                        style={{
                                            background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}10)`,
                                            borderColor: stat.color
                                        }}
                                    >
                                        <span style={{ color: stat.color }}>
                                            {getRepoInitials(stat.name)}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-semibold text-gray-900 truncate"
                                            style={{ color: stat.color }}
                                        >
                                            {stat.name}
                                        </h3>

                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-xs text-gray-500">
                                                {getRepositoryAge(stat.createdAt)} old
                                            </span>
                                            {stat.language && (
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{
                                                        background: `${stat.color}15`,
                                                        color: stat.color,
                                                        border: `1px solid ${stat.color}30`
                                                    }}
                                                >
                                                    {stat.language}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleExpand(stat.name)}
                                    className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    {expandedRepo === stat.name ? '−' : '+'}
                                </button>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900">{stat.totalCommits}</div>
                                    <div className="text-xs text-gray-500">Commits</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900">{stat.maxConsecutiveDays}</div>
                                    <div className="text-xs text-gray-500">Streak</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900">{stat.maxCommits}</div>
                                    <div className="text-xs text-gray-500">Peak</div>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedRepo === stat.name && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                                {/* Activity Level */}
                                <div className="py-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">Activity Level</span>
                                        <span className="text-xs text-gray-500 capitalize">
                                            {getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays).replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${getActivityColor(getActivityLevel(stat.totalCommits, stat.maxConsecutiveDays))}`}
                                            style={{
                                                width: `${Math.min((stat.totalCommits / 50) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="py-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                                    {getRecentCommits(stat).length > 0 ? (
                                        <div className="space-y-2">
                                            {getRecentCommits(stat).map((commit, index) => (
                                                <div key={index} className="flex items-start space-x-2 text-sm">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-900 truncate">{commit.message}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatDate(commit.date)} • {commit.author}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <div className="text-gray-400 text-sm">No recent commits</div>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 gap-4 py-3">
                                    <div>
                                        <div className="text-xs text-gray-500">Created</div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatDate(stat.createdAt)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Last Commit</div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatDate(stat.lastCommitDate)}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2 pt-3">
                                    <button
                                        onClick={() => window.open(`https://github.com/${username}/${stat.name}`, '_blank')}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <span>View Repository</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Load More/Less Buttons */}
            {(canShowMore || canShowLess) && (
                <div className="flex justify-center mt-6 space-x-3">
                    {canShowMore && (
                        <button
                            onClick={showMore}
                            className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 py-2.5 px-6 rounded-xl text-sm font-medium transition-colors"
                        >
                            Load More
                        </button>
                    )}
                    {canShowLess && (
                        <button
                            onClick={showLess}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-6 rounded-xl text-sm font-medium transition-colors"
                        >
                            Show Less
                        </button>
                    )}
                </div>
            )}

            {/* Empty State */}
            {stats.length === 0 && !loading && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
                    <p className="text-gray-500 text-sm">This user doesn&apos;t have any public repositories yet.</p>
                </div>
            )}
        </div>
    );
}