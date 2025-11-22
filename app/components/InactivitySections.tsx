'use client';

import { InactivityData } from '@/types';

interface InactivitySectionsProps {
    data: InactivityData;
    username: string;
}

export default function InactivitySections({ data, username }: InactivitySectionsProps) {
    const { inactiveRepos, repos15Days } = data;

    console.log('inactiveRepos: ', inactiveRepos);


    const getStatusClass = (reason: string) => {
        if (reason.includes('15 days')) return 'warning';
        if (reason.includes('21 days')) return 'inactive';
        if (reason.includes('Empty') || reason.includes('not found')) return 'empty';
        if (reason.includes('Error')) return 'error';
        return 'very-inactive';
    };

    const getDaysCounterClass = (days: number | string) => {
        if (days === 'N/A') return 'empty';
        if (typeof days === 'number') {
            if (days <= 7) return 'recent';
            if (days <= 15) return 'moderate';
            if (days <= 21) return 'inactive';
            return 'very-inactive';
        }
        return 'empty';
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        // <div className="repo-stats">
        <div className="space-y-8" id="inactivitySections">
            {inactiveRepos.length > 0 && (
                <div className="inactive-repos">
                    <h3 className="text-2xl font-bold mb-2">Inactive Repositories</h3>
                    <p className="section-subtitle">Repositories with no commits in the last 21 days</p>
                    <div className="inactive-repos-grid">
                        {inactiveRepos.map((repo, index) => (
                            <div key={index} className={`repo-status-card ${getStatusClass(repo.reason)}`}>
                                <div className="repo-status-header">
                                    <span className="repo-name">{repo.name}</span>

                                    <div className="status-info">
                                        <span className="days-counter warning"
                                            title={`${repo.daysWithoutCommits} days without commits`}>
                                            {repo.daysWithoutCommits} day{repo.daysWithoutCommits !== 1 ? 's' : ''}
                                        </span>
                                        <div className="tooltip-wrapper">
                                            <span className={`status-indicator ${getStatusClass(repo.reason)}`}></span>
                                            <div className="tooltip">
                                                Status: {repo.reason}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="repo-status-details">
                                    <div className="commit-info-container">
                                        <div className="tooltip-wrapper">
                                            <span className="commit-date">
                                                Last commit: {formatDate(repo.lastCommit)}
                                            </span>
                                            <div className="tooltip">
                                                <div>Commit Date: {formatDate(repo.lastCommit)}</div>
                                                <div>Days since: {repo.daysWithoutCommits} days</div>
                                                <div>Branch: main</div>
                                            </div>
                                        </div>
                                        <span className="days-ago">
                                            ({repo.daysWithoutCommits} day{repo.daysWithoutCommits !== 1 ? 's' : ''} ago)
                                        </span>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            )}

            {repos15Days.length > 0 && (
                // <div className="repo-stats">
                <div className="inactive-repos">
                    <h3 className="text-2xl font-bold mb-2">Moderately Inactive Repositories</h3>
                    <p className="section-subtitle">Repositories with no commits in the last 15 days</p>
                    <div className="inactive-repos-grid">
                        {repos15Days.map((repo, index) => (
                            <div key={index} className="repo-status-card warning">
                                <div className="repo-status-header">
                                    <span className="repo-name">{repo.name}</span>
                                    <div className="status-info">
                                        {repo.daysWithoutCommits !== 'N/A' && (
                                            <div className="tooltip-wrapper">
                                                <span className={`days-counter ${getDaysCounterClass(repo?.daysWithoutCommits)}`}>
                                                    {repo.daysWithoutCommits} day{repo.daysWithoutCommits !== 1 ? 's' : ''}
                                                </span>
                                                <div className="tooltip">
                                                    {repo.daysWithoutCommits} days without commits
                                                </div>
                                            </div>
                                        )}
                                        <span className="status-indicator warning"
                                            title="Warning: No commits in 15+ days"></span>
                                    </div>
                                </div>
                                <div className="repo-status-details">
                                    {repo.lastCommit && (
                                        <div className="commit-info">
                                            <span className="last-commit">Last commit: {formatDate(repo.lastCommit)}</span>
                                            <span className="days-ago">
                                                ({repo.daysWithoutCommits} day{repo.daysWithoutCommits !== 1 ? 's' : ''} ago)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                // </div>
            )}
        </div>
        // </div>
    );
}