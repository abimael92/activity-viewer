'use client';

import { useState, useEffect } from 'react';
import Charts from './components/Charts';
import InactivitySections from './components/InactivitySections';
import RepoStats from './components/RepoStats';
import { fetchWithAuth, getCachedData, setCachedData, loadInactivityData } from '@/lib/github';
import { ChartData, ChartDataset, InactivityData, RepoStat } from '@/types';

interface GitHubCommit {
    commit: {
        author?: {
            date?: string;
        };
    };
}

interface GitHubRepo {
    name: string;
    created_at: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
}

interface InactivitySectionsProps {
    inactivityData: InactivityData; // Make sure this prop is defined
}

export default function Home() {
    const [username, setUsername] = useState('abimael92');
    const [daysFilter, setDaysFilter] = useState('7');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [inactivityData, setInactivityData] = useState<InactivityData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const loadData = async () => {
        if (!username.trim()) {
            setError('Please enter a GitHub username');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            const cacheKey = `${username}_${daysFilter}`;
            const cachedData = getCachedData<ChartData>(cacheKey);

            if (cachedData) {
                setChartData(cachedData);
                setLoading(false);
                return;
            }

            const userRes = await fetchWithAuth(`https://api.github.com/users/${username}`);
            if (!userRes.ok) throw new Error(`User "${username}" not found on GitHub`);

            const repoRes = await fetchWithAuth(
                `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
            );

            if (!repoRes.ok) {
                const errorData = await repoRes.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch repositories: ${repoRes.status}`);
            }

            const repos: GitHubRepo[] = await repoRes.json();

            if (repos.length === 0) {
                setError(`User "${username}" doesn't have any public repositories.`);
                setLoading(false);
                return;
            }

            // const end = new Date();
            // const start = new Date();
            // start.setDate(end.getDate() - parseInt(daysFilter));

            const now = new Date();
            const currentYear = now.getFullYear();
            const start = new Date(`${currentYear}-01-01T00:00:00Z`);
            const end = new Date();

            const labels: string[] = [];
            const fullDates: string[] = [];
            const dateMap: Record<string, number> = {};
            const currentDate = new Date(start);

            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const label = currentDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short'
                });
                labels.push(label);
                fullDates.push(dateStr);
                dateMap[dateStr] = labels.length - 1;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const datasets: ChartDataset[] = [];
            const colors = [
                '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
                '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
            ];

            const repoStats: RepoStat[] = [];

            for (let i = 0; i < repos.length; i++) {
                const repo = repos[i];
                let lastCommitDate: string | null = null;
                let maxCommits = 0;
                let maxCommitsDate: string | null = null;
                let totalCommits = 0;

                try {
                    const commitsRes = await fetchWithAuth(
                        `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`
                    );

                    if (commitsRes.status === 409 || commitsRes.status === 404) continue;
                    if (!commitsRes.ok) continue;

                    const commits: GitHubCommit[] = await commitsRes.json();
                    if (!Array.isArray(commits)) continue;

                    const repoDailyCount = new Array(labels.length).fill(0);

                    commits.forEach((c) => {
                        const commitDateStr = c.commit?.author?.date;
                        if (!commitDateStr) return;

                        const commitDateUTC = new Date(commitDateStr);
                        const localDate = new Date(
                            commitDateUTC.getFullYear(),
                            commitDateUTC.getMonth(),
                            commitDateUTC.getDate()
                        );
                        const dateStr = localDate.toISOString().split('T')[0];

                        const index = dateMap[dateStr];
                        if (index !== undefined) {
                            repoDailyCount[index]++;
                            totalCommits++;

                            if (repoDailyCount[index] > maxCommits) {
                                maxCommits = repoDailyCount[index];
                                maxCommitsDate = dateStr;
                            }

                            const currentCommitDate = commitDateUTC.toISOString();
                            if (!lastCommitDate || currentCommitDate > lastCommitDate) {
                                lastCommitDate = currentCommitDate;
                            }
                        }
                    });

                    let currentStreak = 0;
                    let maxConsecutiveDays = 0;
                    for (const count of repoDailyCount) {
                        if (count > 0) {
                            currentStreak++;
                            maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak);
                        } else {
                            currentStreak = 0;
                        }
                    }

                    if (totalCommits > 0) {
                        repoStats.push({
                            name: repo.name,
                            maxCommits,
                            maxCommitsDate,
                            totalCommits,
                            color: colors[i % colors.length],
                            createdAt: repo.created_at,
                            maxConsecutiveDays,
                            description: repo.description,
                            lastCommitDate: lastCommitDate,
                            language: repo.language,
                            stars: repo.stargazers_count,
                            forks: repo.forks_count
                        });

                        datasets.push({
                            label: repo.name,
                            data: repoDailyCount,
                            backgroundColor: colors[i % colors.length] + '20',
                            borderColor: colors[i % colors.length],
                            borderWidth: 2,
                            pointBackgroundColor: colors[i % colors.length],
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 1,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            fill: true,
                            tension: 0.3,
                        });
                    }

                    await delay(500);
                } catch (err) {
                    console.error(err);
                    continue;
                }
            }

            const dataToCache: ChartData = {
                datasets,
                repoStats,
                labels,
                fullDates
            };

            setCachedData(cacheKey, dataToCache);
            setChartData(dataToCache);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const loadInactivitySections = async () => {
        if (!username.trim()) return;

        try {
            const ignoredRepos = [
                "ecommerce-fe",
                "college_project",
                "my_portfolio2",
                "ecommerce_be",
                "postList",
                "my-portfolio",
                "cine-kachorro",
                "interview-codingchallenge-fsjs",
                "Explore-California",
                "PantryManagerUI",
            ];

            const data = await loadInactivityData(username);

            // Filter out ignored repos
            const filteredData = {
                ...data,
                inactiveRepos: data.inactiveRepos?.filter(
                    (repo: any) => !ignoredRepos.includes(repo.name)
                ) || [],
            };

            setInactivityData(filteredData);
        } catch (err) {
            console.error('Error loading inactivity sections:', err);
        }
    };


    useEffect(() => {
        if (username) {
            loadInactivitySections();
        }
    }, [username]);

    return (
        <div id="app">
            <header className="app-header">
                <h1 className="app-title">Activity Viewer</h1>
                <div className="input-container">
                    <input
                        type="text"
                        className="username-input"
                        placeholder="Enter GitHub username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <select
                        className="days-filter"
                        value={daysFilter}
                        onChange={(e) => setDaysFilter(e.target.value)}
                    >
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                    </select>
                    <button
                        className="load-button"
                        onClick={loadData}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Load Activity'}
                    </button>
                </div>
            </header>

            <main className="charts-container">
                {error && (
                    <div className="error-state">
                        <h3>Error</h3>
                        <p>{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>Loading repository data...</p>
                    </div>
                )}

                {chartData && (
                    <>
                        <Charts
                            chartData={chartData}
                            daysFilter={parseInt(daysFilter)}
                            username={username}
                        />
                        <RepoStats
                            stats={chartData.repoStats} // Change prop name from repoStats to stats
                            chartData={chartData}
                            username={username} // Add missing username prop
                        />
                    </>
                )}

                {!loading && !chartData && !error && (
                    <div className="empty-state">
                        <h3>No data loaded</h3>
                        <p>Enter a GitHub username and click Load Activity to see repository statistics.</p>
                    </div>
                )}
            </main>

            {inactivityData && (
                <InactivitySections
                    data={inactivityData}  // Change from inactivityData to data
                    username={username}    // Add the missing username prop
                />
            )}
        </div>
    );
}
