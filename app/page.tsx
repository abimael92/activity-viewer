'use client';

import { useState, useEffect, useCallback } from 'react';
import Charts from './components/Charts';
import InactivitySections from './components/InactivitySections';
import RepoStats from './components/RepoStats';
import { RepoActivitySection } from './components/RepoActivitySection';

import { getRepoStatus } from '@/lib/repoStatus';
import { fetchWithAuth, getCachedData, setCachedData, loadInactivityData } from '@/lib/github';
import { ChartData, InactiveRepo, InactivityData, RepoStat } from '@/types';
import TodoList from './components/TodoList';
// Replace the COLORS array in your main page with:
import { COLORS } from '@/lib/colors';
// Remove the local COLORS array

interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            date: string;
            name: string;
        };
    };
    author: {
        login: string;
    } | null;
}

interface GitHubRepo {
    name: string;
    created_at: string;
    description: string | null;
    language?: string | null;
    stargazers_count: number;
    forks_count: number;
}

interface ProcessedRepo {
    repoDailyCount: number[];
    stats: RepoStat;
}

interface CommitData {
    hash?: string;
    message: string;
    date: string;
    author?: string;
}


const IGNORED_REPOS = [
    "ecommerce-fe", "college_project", "my_portfolio2", "ecommerce_be", "postList",
    "my-portfolio", "cine-kachorro", "interview-codingchallenge-fsjs",
    "Explore-California", "PantryManagerUI",
];

// Move processRepoCommits outside component
const processRepoCommits = async (
    username: string,
    repo: GitHubRepo,
    start: Date,
    end: Date,
    dateMap: Record<string, number>,
    labels: string[],
    colorIndex: number
): Promise<ProcessedRepo | null> => {
    let allCommits: GitHubCommit[] = [];
    let page = 1;
    const lastDayCommits: CommitData[] = [];

    try {
        const statusPromise = getRepoStatus(username, repo.name);
        while (page <= 3) {
            const commitsRes = await fetchWithAuth(
                `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100&page=${page}`
            );

            if (!commitsRes.ok) break;

            const commits = await commitsRes.json();

            if (commits.length === 0) break;

            allCommits = allCommits.concat(commits);

            if (page === 1) { // Only get from first page for recent commits
                commits.slice(0, 10).forEach((commit: GitHubCommit) => {
                    lastDayCommits.push({
                        hash: commit.sha,
                        message: commit.commit?.message || 'No message',
                        date: commit.commit?.author?.date || new Date().toISOString(),
                        author: commit.commit?.author?.name || commit.author?.login || 'Unknown'
                    });
                });
            }

            page++;
        }

        const repoDailyCount = new Array(labels.length).fill(0);
        let totalCommits = 0;
        let maxCommits = 0;
        let maxCommitsDate: string | null = null;
        let lastCommitDate: string | null = null;

        allCommits.forEach((c) => {
            const commitDateStr = c.commit?.author?.date;
            if (!commitDateStr) return;

            const commitDate = new Date(commitDateStr);
            const dateStr = commitDate.toISOString().split('T')[0];

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
        const { deployment, mergeStatus } = await statusPromise;

        return {
            repoDailyCount,
            stats: {
                name: repo.name,
                totalCommits,
                maxCommits,
                maxCommitsDate,
                maxConsecutiveDays: maxStreak,
                lastCommitDate,
                description: repo.description,
                createdAt: repo.created_at,
                color: COLORS[colorIndex % COLORS.length],
                language: repo.language ?? undefined,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                loading: false,
                lastDayCommits: lastDayCommits.slice(0, 5),
                deployment, // Add deployment status
                mergeStatus // Add merge status
            }
        };
    } catch (error) {
        console.error(`Error processing repo ${repo.name}:`, error);
        return null;
    }
};

export default function Home() {
    const [username, setUsername] = useState('abimael92');
    const [daysFilter, setDaysFilter] = useState('7');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [inactivityData, setInactivityData] = useState<InactivityData | null>(null);
    const [loading, setLoading] = useState(false);
    const [fullYearLoading, setFullYearLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullYearRepoStats, setFullYearRepoStats] = useState<RepoStat[]>([]);

    // Memoized load function
    const loadData = useCallback(async () => {
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

            // Parallel API calls
            const [userRes, repoRes] = await Promise.all([
                fetchWithAuth(`https://api.github.com/users/${username}`),
                fetchWithAuth(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`)
            ]);

            if (!userRes.ok) throw new Error(`User "${username}" not found on GitHub`);
            if (!repoRes.ok) throw new Error(`Failed to fetch repositories`);

            const repos = await repoRes.json();
            if (repos.length === 0) throw new Error(`User "${username}" has no public repos.`);

            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(daysFilter));

            // Generate date labels
            const labels: string[] = [];
            const fullDates: string[] = [];
            const dateMap: Record<string, number> = {};
            const currentDate = new Date(start);

            // Set to UTC to avoid timezone issues
            currentDate.setUTCHours(0, 0, 0, 0);
            const endUTC = new Date(end);
            endUTC.setUTCHours(23, 59, 59, 999);

            while (currentDate <= end) {
                const dateStr = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
                    .toISOString()
                    .split("T")[0];

                const localDate = new Date(currentDate.getTime() + currentDate.getTimezoneOffset() * 60000);

                // Generate label in local time for display, but store UTC date for processing
                labels.push(
                    localDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short'
                    })
                );

                fullDates.push(dateStr);
                dateMap[dateStr] = labels.length - 1;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Process repos in parallel with limit
            const repoPromises = repos.slice(0, 8).map((repo: GitHubRepo, i: number) =>
                processRepoCommits(username, repo, start, end, dateMap, labels, i)
            );

            const results = await Promise.all(repoPromises);

            // Filter valid results
            const validResults = results.filter((result): result is ProcessedRepo =>
                result !== null && result.stats.totalCommits > 0
            );

            if (validResults.length === 0) {
                throw new Error('No commit activity found in the selected time period');
            }

            const datasets = [];
            const repoStats = [];

            for (const result of validResults) {
                const { repoDailyCount, stats } = result;
                repoStats.push(stats);
                datasets.push({
                    label: stats.name,
                    data: repoDailyCount,
                    backgroundColor: stats.color + '20',
                    borderColor: stats.color,
                    borderWidth: 2.5,
                    pointBackgroundColor: stats.color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.01,
                });
            }

            const dataToCache: ChartData = { datasets, repoStats, labels, fullDates };
            setCachedData(cacheKey, dataToCache);
            setChartData(dataToCache);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, [username, daysFilter]);

    // Optimized full year stats
    const loadFullYearRepoStats = useCallback(async () => {
        if (!username.trim()) return;

        setFullYearLoading(true);
        try {
            const currentYear = new Date().getFullYear();
            const start = new Date(`${currentYear}-01-01T00:00:00Z`);
            const end = new Date();

            const labels: string[] = [];
            const dateMap: Record<string, number> = {};
            const currentDate = new Date(start);

            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];
                labels.push(dateStr);
                dateMap[dateStr] = labels.length - 1;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const repoRes = await fetchWithAuth(`https://api.github.com/users/${username}/repos?per_page=15`);
            const repos = await repoRes.json();
            const filteredRepos = repos.filter((repo: GitHubRepo) => !IGNORED_REPOS.includes(repo.name));

            const topRepos = filteredRepos.slice(0, 10);
            const statsPromises = topRepos.map((repo: GitHubRepo, i: number) =>
                processRepoCommits(username, repo, start, end, dateMap, labels, i)
            );

            const results = await Promise.all(statsPromises);
            const fullYearStats = results
                .filter((result): result is ProcessedRepo => result !== null && result.stats.totalCommits > 0)
                .map(result => result.stats);

            setFullYearRepoStats(fullYearStats);
        } catch (error) {
            console.error('Error loading full year stats:', error);
        } finally {
            setFullYearLoading(false);
        }
    }, [username]);

    // Optimized inactivity data
    const loadInactivitySections = useCallback(async () => {
        if (!username.trim()) return;

        try {
            const data = await loadInactivityData(username);
            const filteredData = {
                ...data,
                inactiveRepos: data.inactiveRepos?.filter(
                    (repo: InactiveRepo) => !IGNORED_REPOS.includes(repo.name)
                ) || [],
            };

            setInactivityData(filteredData);
        } catch (err) {
            console.error('Error loading inactivity sections:', err);
        }
    }, [username]);

    // Debounced effects with cleanup
    useEffect(() => {
        const abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            if (!abortController.signal.aborted) {
                loadFullYearRepoStats();
                loadInactivitySections();
            }
        }, 500);

        return () => {
            clearTimeout(timeoutId);
            abortController.abort();
        };
    }, [username, loadFullYearRepoStats, loadInactivitySections]);



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

                    </>
                )}

                {!loading && !chartData && !error && (
                    <div className="empty-state">
                        <h3>No data loaded</h3>
                        <p>Enter a GitHub username and click Load Activity to see repository statistics.</p>
                    </div>
                )}

                <RepoActivitySection className="mt-6" />

                {fullYearRepoStats && (
                    <RepoStats
                        stats={fullYearRepoStats}
                        username={username}
                        loading={fullYearLoading}
                    />
                )}

                <TodoList
                    projectId="github-tracker"
                    githubUsername={username}
                />
            </main>

            {inactivityData && (
                <InactivitySections data={inactivityData} username={username} />
            )}
        </div>
    );
}