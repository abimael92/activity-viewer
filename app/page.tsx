'use client';

import { useState, useEffect, useCallback } from 'react';
import Charts from './components/Charts';
import InactivitySections from './components/InactivitySections';
import RepoStats from './components/RepoStats';
import { RepoActivitySection } from './components/RepoActivitySection';
import NotificationBell from './components/NotificationBell';
import {
	fetchGitHubCommits,
	fetchGitHubRepos,
	fetchGitHubUser,
	fetchRepoStatus,
	getCachedData,
	setCachedData,
	loadInactivityData,
} from '@/lib/github';
import { ChartData, InactiveRepo, InactivityData, RepoStat } from '@/types';
import TodoList from './components/TodoList';
import { COLORS } from '@/lib/colors';
import Snackbar, { showSnackbar } from './components/Snackbar';

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

interface RepoActivity {
    name: string;
    yesterdayCommits: number;
    todayCommits: number;
    change: number;
    trend: 'up' | 'down' | 'same';
    extra: Record<string, number>;
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
        const statusPromise = fetchRepoStatus(username, repo.name);
        while (page <= 3) {
            let commits;
            try {
                commits = await fetchGitHubCommits(username, repo.name, {
                    since: start.toISOString(),
                    until: end.toISOString(),
                    perPage: 100,
                    page,
                }) as GitHubCommit[];
                if (commits.length === 0) break;
            } catch (error) {
                console.error(`Failed to parse JSON for ${repo.name}:`, error);
                break;
            }

            allCommits = allCommits.concat(commits);

            if (page === 1) {
                commits.slice(0, 15).forEach((commit: GitHubCommit) => {
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
    const [username, setUsername] = useState('');
    const [daysFilter, setDaysFilter] = useState('7');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [inactivityData, setInactivityData] = useState<InactivityData | null>(null);
    const [loading, setLoading] = useState(false);
    const [fullYearLoading, setFullYearLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullYearRepoStats, setFullYearRepoStats] = useState<RepoStat[]>([]);
    const [showTotal, setShowTotal] = useState(true);
    const [repoActivityData, setRepoActivityData] = useState<RepoActivity[]>([]);
    const [repoActivityLoading, setRepoActivityLoading] = useState(false);
    const [repoActivityDates, setRepoActivityDates] = useState({ today: '', yesterday: '' });
    const [notificationSettings, setNotificationSettings] = useState({
        sound: true,
        toast: true,
        autoOpen: true,
        maxAge: 30 // days
    });

    useEffect(() => {
        const saved = localStorage.getItem('notificationSettings');
        if (saved) {
            setNotificationSettings(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    }, [notificationSettings]);

    // Memoized load function - Use global showSnackbar
    const loadData = useCallback(async () => {
        if (!username.trim()) {
            showSnackbar('Please enter a GitHub username', 'error');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const cacheKey = `chart_${username}_${daysFilter}d`;
            const cachedData = getCachedData<ChartData>(cacheKey);

            if (cachedData) {
                setChartData(cachedData);
                setLoading(false);
                showSnackbar('Loaded from cache!', 'success');
                return;
            }

            // Parallel API calls
            await fetchGitHubUser(username);
            const repos = await fetchGitHubRepos(username, {
                sort: 'updated',
                perPage: 10,
            }) as GitHubRepo[];

            if (!Array.isArray(repos)) {
                throw new Error(`Failed to fetch repositories`);
            }
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

            // Create chart data object
            const dataToCache: ChartData = {
                datasets,
                repoStats,
                labels,
                fullDates
            };

            setCachedData(cacheKey, dataToCache);
            setChartData(dataToCache);
            showSnackbar(`Loaded ${validResults.length} repositories!`, 'success');

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(msg);
            setError(msg);
            showSnackbar(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [username, daysFilter]);

    // Full year stats
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

            const repos = await fetchGitHubRepos(username, { perPage: 30 }) as GitHubRepo[];
            const filteredRepos = repos.filter((repo: GitHubRepo) => !IGNORED_REPOS.includes(repo.name));

            const topRepos = filteredRepos.slice(0, 20);
            const statsPromises = topRepos.map((repo: GitHubRepo, i: number) =>
                processRepoCommits(username, repo, start, end, dateMap, labels, i)
            );

            const results = await Promise.all(statsPromises);
            const fullYearStats = results
                .filter((result): result is ProcessedRepo => result !== null && result.stats.totalCommits > 0)
                .map(result => result.stats);

            console.log('Filtered stats:', fullYearStats.map(s => s.name));

            setFullYearRepoStats(fullYearStats);
            showSnackbar('Full year stats loaded!', 'info');
        } catch (error) {
            console.error('Error loading full year stats:', error);
            showSnackbar('Failed to load full year stats', 'error');
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
            if (filteredData.inactiveRepos?.length > 0) {
                showSnackbar(`Found ${filteredData.inactiveRepos.length} inactive repos`, 'warning');
            }
        } catch (err) {
            console.error('Error loading inactivity sections:', err);
            showSnackbar('Failed to load inactivity data', 'error');
        }
    }, [username]);

    // Fetch repo activity data (today/yesterday commits)
    const fetchRepoActivity = useCallback(async (extraDates: string[] = []) => {
        if (!username.trim()) return;

        setRepoActivityLoading(true);

        try {
            // Calculate dates
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const yesterdayStart = new Date(yesterday);
            yesterdayStart.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);

            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);

            setRepoActivityDates({
                today: today.toISOString().split('T')[0],
                yesterday: yesterday.toISOString().split('T')[0]
            });

            // Fetch user's repositories
            const repos = await fetchGitHubRepos(username, {
                sort: 'updated',
                perPage: 20
            }) as Array<{ name: string }>;

            // Helper function to fetch commits for a date range
            const fetchRepoCommits = async (repoName: string, since: string, until: string): Promise<number> => {
                try {
                    let allCommits: unknown[] = [];
                    let page = 1;

                    while (page <= 3) {
                        const commits = await fetchGitHubCommits(username, repoName, {
                            since,
                            until,
                            perPage: 100,
                            page,
                        });
                        if (commits.length === 0) break;
                        allCommits = allCommits.concat(commits);
                        page++;
                    }

                    return allCommits.length;
                } catch (error) {
                    console.error(`Error fetching commits for ${repoName}:`, error);
                    return 0;
                }
            };

            // Fetch commit counts for each repo
            const activityPromises = repos.map(async (repo: { name: string }) => {
                const todayCommits = await fetchRepoCommits(repo.name, todayStart.toISOString(), todayEnd.toISOString());
                const yesterdayCommits = await fetchRepoCommits(repo.name, yesterdayStart.toISOString(), yesterdayEnd.toISOString());

                const change = todayCommits - yesterdayCommits;
                const trend: 'up' | 'down' | 'same' = change > 0 ? 'up' : change < 0 ? 'down' : 'same';

                // Fetch commit count for each extra date
                const extra: Record<string, number> = {};
                for (const dateStr of extraDates) {
                    const day = new Date(dateStr);
                    const start = new Date(day);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(day);
                    end.setHours(23, 59, 59, 999);
                    const commitCount = await fetchRepoCommits(repo.name, start.toISOString(), end.toISOString());
                    extra[dateStr] = commitCount;
                }

                return {
                    name: repo.name,
                    yesterdayCommits,
                    todayCommits,
                    change: Math.abs(change),
                    trend,
                    extra
                };
            });

            const activities = await Promise.all(activityPromises);

            // Filter & sort
            const filteredActivities = activities
                .filter(repo => repo.yesterdayCommits > 0 || repo.todayCommits > 0 || Object.values(repo.extra).some((count: unknown) => Number(count) > 0))
                .sort((a, b) => b.todayCommits - a.todayCommits);

            setRepoActivityData(filteredActivities);
        } catch (error) {
            console.error('Error fetching repo activity:', error);
        } finally {
            setRepoActivityLoading(false);
        }
    }, [username]);

    // Debounced effects with cleanup
    useEffect(() => {
        const abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            if (!abortController.signal.aborted) {
                loadFullYearRepoStats();
                loadInactivitySections();
                fetchRepoActivity();
            }
        }, 500);

        return () => {
            clearTimeout(timeoutId);
            abortController.abort();
        };
    }, [username, loadFullYearRepoStats, loadInactivitySections, fetchRepoActivity]);

    return (
        <div id="app">
            {/* Render the global Snackbar component */}
            <Snackbar />

            {/* Notification Bell */}
            {inactivityData && notificationSettings.toast && (
                <NotificationBell
                    inactivityData={inactivityData}
                    username={username}
                    onNotificationClick={(repoName: string, type: 'stale' | 'idle' | 'inactive') => {
                        showSnackbar(`Navigating to ${repoName}`, 'info');
                        console.log(`Notification clicked: ${repoName} (${type})`);
                        // Optionally scroll to the section
                        const element = document.getElementById('inactivitySections');
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}
                />
            )}

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

                    {chartData && (<button
                        className={`toggle-button ${showTotal ? 'active' : ''}`}
                        onClick={() => setShowTotal(!showTotal)}
                    >
                        {showTotal ? 'Hide Total' : 'Show Total'}
                    </button>)}
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

                <RepoActivitySection 
                    className="mt-6" 
                    username={username}
                    activityData={repoActivityData}
                    loading={repoActivityLoading}
                    dates={repoActivityDates}
                    onRefresh={(extraDates) => fetchRepoActivity(extraDates)}
                />

                <RepoStats
                    stats={fullYearRepoStats}
                    username={username}
                    loading={fullYearLoading}
                />

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