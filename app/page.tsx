'use client';

import { useState, useEffect } from 'react';
import Charts from './components/Charts';
import InactivitySections from './components/InactivitySections';
import RepoStats from './components/RepoStats';
import { fetchWithAuth, getCachedData, setCachedData, loadInactivityData } from '@/lib/github';
import { ChartData, ChartDataset, InactiveRepo, InactivityData, RepoStat } from '@/types';

interface GitHubCommit {
    commit: { author?: { date?: string } };
}

interface GitHubRepo {
    name: string;
    created_at: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
}

export default function Home() {
    const [username, setUsername] = useState('abimael92');
    const [daysFilter, setDaysFilter] = useState('7');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [inactivityData, setInactivityData] = useState<InactivityData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullYearRepoStats, setFullYearRepoStats] = useState<RepoStat[]>([]);

    const loadData = async () => {
        if (!username.trim()) return setError('Please enter a GitHub username');
        setLoading(true);
        setError(null);

        try {
            const cacheKey = `chart_${username}_${daysFilter}d`;
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
            if (!repoRes.ok) throw new Error(`Failed to fetch repositories`);

            const repos: GitHubRepo[] = await repoRes.json();
            if (repos.length === 0) throw new Error(`User "${username}" has no public repos.`);

            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(daysFilter)); // Dynamic start date

            const labels: string[] = [];
            const fullDates: string[] = [];
            const dateMap: Record<string, number> = {};
            const currentDate = new Date(start);

            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];
                labels.push(
                    currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
                );
                fullDates.push(dateStr);
                dateMap[dateStr] = labels.length - 1;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const colors = [
                '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
                '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
            ];

            const datasets: ChartDataset[] = [];
            const repoStats: RepoStat[] = [];

            for (let i = 0; i < repos.length; i++) {
                const repo = repos[i];
                const commitsRes = await fetchWithAuth(
                    `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`
                );

                if (!commitsRes.ok) continue;

                const commits: GitHubCommit[] = await commitsRes.json();
                const repoDailyCount = new Array(labels.length).fill(0);

                let totalCommits = 0;
                let maxCommits = 0;
                let maxCommitsDate: string | null = null;
                let lastCommitDate: string | null = null;

                commits.forEach((c) => {
                    const commitDateStr = c.commit?.author?.date;
                    if (!commitDateStr) return;

                    const dateStr = new Date(commitDateStr).toISOString().split('T')[0];
                    const index = dateMap[dateStr];
                    if (index !== undefined) {
                        repoDailyCount[index]++;
                        totalCommits++;
                        if (repoDailyCount[index] > maxCommits) {
                            maxCommits = repoDailyCount[index];
                            maxCommitsDate = dateStr;
                        }
                        if (!lastCommitDate || commitDateStr > lastCommitDate) {
                            lastCommitDate = commitDateStr;
                        }
                    }
                });

                let streak = 0, maxStreak = 0;
                for (const count of repoDailyCount) {
                    if (count > 0) {
                        streak++;
                        maxStreak = Math.max(maxStreak, streak);
                    } else streak = 0;
                }

                if (totalCommits > 0) {
                    repoStats.push({
                        name: repo.name,
                        totalCommits,
                        maxCommits,
                        maxCommitsDate,
                        maxConsecutiveDays: maxStreak,
                        lastCommitDate,
                        description: repo.description,
                        createdAt: repo.created_at,
                        color: colors[i % colors.length],
                        language: repo.language,
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
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
            }

            const dataToCache: ChartData = { datasets, repoStats, labels, fullDates };
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
                "ecommerce-fe", "college_project", "my_portfolio2", "ecommerce_be", "postList",
                "my-portfolio", "cine-kachorro", "interview-codingchallenge-fsjs",
                "Explore-California", "PantryManagerUI",
            ];
            const data = await loadInactivityData(username);
            const filteredData = {
                ...data,
                inactiveRepos: data.inactiveRepos?.filter(
                    (repo: InactiveRepo) => !ignoredRepos.includes(repo.name)
                ) || [],
            };
            setInactivityData(filteredData);
        } catch (err) {
            console.error('Error loading inactivity sections:', err);
        }
    };

    const loadFullYearRepoStats = async () => {
        const currentYear = new Date().getFullYear();
        const start = new Date(`${currentYear}-01-01T00:00:00Z`);
        const end = new Date();

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

        const repoRes = await fetchWithAuth(`https://api.github.com/users/${username}/repos`);
        const repos: GitHubRepo[] = await repoRes.json();

        // Filter out ignored repos
        const filteredRepos = repos.filter(repo => !ignoredRepos.includes(repo.name));

        const fullYearStats: RepoStat[] = [];

        // Create date map for the full year
        const labels: string[] = [];
        const fullDates: string[] = [];
        const dateMap: Record<string, number> = {};
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            labels.push(dateStr);
            fullDates.push(dateStr);
            dateMap[dateStr] = labels.length - 1;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const colors = [
            '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
            '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
        ];

        for (let i = 0; i < filteredRepos.length; i++) {
            const repo = filteredRepos[i];
            try {
                const commitsRes = await fetchWithAuth(
                    `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100`
                );

                if (!commitsRes.ok) continue;

                const commits: GitHubCommit[] = await commitsRes.json();
                const repoDailyCount = new Array(labels.length).fill(0);

                let totalCommits = 0;
                let maxCommits = 0;
                let maxCommitsDate: string | null = null;
                let lastCommitDate: string | null = null;

                // Process commits to calculate metrics
                commits.forEach((c) => {
                    const commitDateStr = c.commit?.author?.date;
                    if (!commitDateStr) return;

                    const dateStr = new Date(commitDateStr).toISOString().split('T')[0];
                    const index = dateMap[dateStr];
                    if (index !== undefined) {
                        repoDailyCount[index]++;
                        totalCommits++;
                        if (repoDailyCount[index] > maxCommits) {
                            maxCommits = repoDailyCount[index];
                            maxCommitsDate = dateStr;
                        }
                        if (!lastCommitDate || commitDateStr > lastCommitDate) {
                            lastCommitDate = commitDateStr;
                        }
                    }
                });

                // Calculate streak
                let streak = 0, maxStreak = 0;
                for (const count of repoDailyCount) {
                    if (count > 0) {
                        streak++;
                        maxStreak = Math.max(maxStreak, streak);
                    } else {
                        streak = 0;
                    }
                }

                fullYearStats.push({
                    name: repo.name,
                    totalCommits,
                    maxCommits,
                    maxCommitsDate,
                    maxConsecutiveDays: maxStreak,
                    lastCommitDate,
                    description: repo.description ?? null,
                    createdAt: repo.created_at,
                    color: colors[i % colors.length],
                    language: repo.language ?? null,
                    stars: repo.stargazers_count ?? 0,
                    forks: repo.forks_count ?? 0,
                });

            } catch (error) {
                console.error(`Error processing repo ${repo.name}:`, error);
                // Still add basic repo info even if commits fail
                fullYearStats.push({
                    name: repo.name,
                    totalCommits: 0,
                    maxCommits: 0,
                    maxCommitsDate: null,
                    maxConsecutiveDays: 0,
                    lastCommitDate: null,
                    description: repo.description ?? null,
                    createdAt: repo.created_at,
                    color: colors[i % colors.length],
                    language: repo.language ?? null,
                    stars: repo.stargazers_count ?? 0,
                    forks: repo.forks_count ?? 0,
                });
            }
        }

        console.log('full year stats:', fullYearStats);
        setFullYearRepoStats(fullYearStats);
    };

    useEffect(() => { if (username) loadFullYearRepoStats(); }, [username]);
    useEffect(() => { if (username) loadInactivitySections(); }, [username]);

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
                    <button className="load-button" onClick={loadData} disabled={loading}>
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
                        <Charts chartData={chartData} daysFilter={parseInt(daysFilter)} username={username} />
                        <RepoStats stats={fullYearRepoStats} username={username} />
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
                <InactivitySections data={inactivityData} username={username} />
            )}
        </div>
    );
}

