'use client';

import { useState, useEffect } from 'react';
import Charts from './components/Charts';
import InactivitySections from './components/InactivitySections';
import RepoStats from './components/RepoStats';
import { fetchWithAuth, getCachedData, setCachedData, loadInactivityData } from '@/lib/github';
import { ChartData, ChartDataset, InactiveRepo, InactivityData, RepoStat, GitHubEvent } from '@/types';

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
    const [showTotal, setShowTotal] = useState(true);

    // const loadData = async () => {
    //     if (!username.trim()) return setError('Please enter a GitHub username');
    //     setLoading(true);
    //     setError(null);

    //     try {
    //         const cacheKey = `chart_${username}_${daysFilter}d`;
    //         const cachedData = getCachedData<ChartData>(cacheKey);
    //         if (cachedData) {
    //             setChartData(cachedData);
    //             setLoading(false);
    //             return;
    //         }

    //         const userRes = await fetchWithAuth(`https://api.github.com/users/${username}`);
    //         if (!userRes.ok) throw new Error(`User "${username}" not found on GitHub`);

    //         const repoRes = await fetchWithAuth(
    //             `https://api.github.com/users/${username}/repos?sort=updated`
    //         );
    //         if (!repoRes.ok) throw new Error(`Failed to fetch repositories`);

    //         const repos: GitHubRepo[] = await repoRes.json();
    //         if (repos.length === 0) throw new Error(`User "${username}" has no public repos.`);

    //         const end = new Date();
    //         const start = new Date();
    //         start.setDate(end.getDate() - parseInt(daysFilter));
    //         // Reset times to start/end of day in UTC
    //         start.setUTCHours(0, 0, 0, 0);
    //         end.setUTCHours(23, 59, 59, 999);

    //         const labels: string[] = [];
    //         const fullDates: string[] = [];
    //         const dateMap: Record<string, number> = {};
    //         const currentDate = new Date(start);

    //         while (currentDate <= end) {
    //             const dateStr = currentDate.toISOString().split('T')[0];

    //             labels.push(
    //                 currentDate.toLocaleDateString('en-US', {
    //                     month: 'short',
    //                     day: 'numeric',
    //                     weekday: 'short',
    //                     timeZone: 'UTC'  // Add this to ensure consistent dates
    //                 })
    //             );

    //             fullDates.push(dateStr);
    //             dateMap[dateStr] = labels.length - 1;
    //             currentDate.setDate(currentDate.getDate() + 1);
    //         }

    //         const colors = [
    //             '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
    //             '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
    //         ];

    //         const datasets: ChartDataset[] = [];
    //         const repoStats: RepoStat[] = [];

    //         for (let i = 0; i < repos.length; i++) {
    //             const repo = repos[i];
    //             let allCommits: GitHubCommit[] = [];
    //             let page = 1;
    //             let hasMoreCommits = true;

    //             // Paginate through all commits
    //             while (hasMoreCommits) {
    //                 const commitsRes = await fetchWithAuth(
    //                     `https://api.github.com/repos/${username}/${repo.name}/commits?since=${start.toISOString()}&until=${end.toISOString()}&per_page=100&page=${page}`
    //                 );

    //                 if (!commitsRes.ok) break;

    //                 const commits: GitHubCommit[] = await commitsRes.json();

    //                 if (commits.length === 0) {
    //                     hasMoreCommits = false;
    //                 } else {
    //                     allCommits = allCommits.concat(commits);
    //                     page++;

    //                     // Safety check to avoid infinite loops
    //                     if (page > 10) break; // Max 1000 commits per repo
    //                 }
    //             }

    //             const repoDailyCount = new Array(labels.length).fill(0);

    //             let totalCommits = 0;
    //             let maxCommits = 0;
    //             let maxCommitsDate: string | null = null;
    //             let lastCommitDate: string | null = null;

    //             allCommits.forEach((c) => {
    //                 const commitDateStr = c.commit?.author?.date;
    //                 if (!commitDateStr) return;

    //                 const commitDate = new Date(commitDateStr);
    //                 const dateStr = commitDate.toISOString().split('T')[0];
    //                 const index = dateMap[dateStr];

    //                 if (index !== undefined) {
    //                     repoDailyCount[index]++;
    //                     totalCommits++;

    //                     if (repoDailyCount[index] > maxCommits) {
    //                         maxCommits = repoDailyCount[index];
    //                         maxCommitsDate = dateStr;
    //                     }

    //                     if (!lastCommitDate || commitDateStr > lastCommitDate) {
    //                         lastCommitDate = commitDateStr;
    //                     }
    //                 }
    //             });

    //             let streak = 0, maxStreak = 0;

    //             for (const count of repoDailyCount) {

    //                 if (count > 0) {
    //                     streak++;
    //                     maxStreak = Math.max(maxStreak, streak);
    //                 } else streak = 0;
    //             }

    //             if (totalCommits > 0) {
    //                 repoStats.push({
    //                     name: repo.name,
    //                     totalCommits,
    //                     maxCommits,
    //                     maxCommitsDate,
    //                     maxConsecutiveDays: maxStreak,
    //                     lastCommitDate,
    //                     description: repo.description,
    //                     createdAt: repo.created_at,
    //                     color: colors[i % colors.length],
    //                     language: repo.language,
    //                     stars: repo.stargazers_count,
    //                     forks: repo.forks_count,
    //                 });

    //                 datasets.push({
    //                     label: repo.name,
    //                     data: repoDailyCount,
    //                     backgroundColor: colors[i % colors.length] + '20',
    //                     borderColor: colors[i % colors.length],
    //                     borderWidth: 2,
    //                     pointBackgroundColor: colors[i % colors.length],
    //                     pointBorderColor: '#ffffff',
    //                     pointBorderWidth: 1,
    //                     pointRadius: 3,
    //                     pointHoverRadius: 5,
    //                     fill: true,
    //                     tension: 0.3,
    //                 });
    //             }
    //         }

    //         // Add this right before setCachedData:
    //         console.log('=== COMMIT DEBUG INFO ===');
    //         console.log(`Total repos processed: ${repoStats.length}`);
    //         console.log(`Total commits across all repos: ${repoStats.reduce((sum, repo) => sum + repo.totalCommits, 0)}`);
    //         console.log('Commits per repo:');
    //         repoStats.forEach(repo => {
    //             console.log(`- ${repo.name}: ${repo.totalCommits} commits`);
    //         });

    //         // Add this after processing all repos
    //         console.log('=== COMMITS PER DAY ===');
    //         labels.forEach((label, index) => {
    //             const dayTotal = datasets.reduce((sum, dataset) => sum + dataset.data[index], 0);
    //             console.log(`${fullDates[index]} (${label}): ${dayTotal} commits`);
    //         });

    //         const dataToCache: ChartData = { datasets, repoStats, labels, fullDates };

    //         setCachedData(cacheKey, dataToCache);
    //         setChartData(dataToCache);

    //     } catch (err) {
    //         setError(err instanceof Error ? err.message : 'An unknown error occurred');
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // Add this state for toggling total contributions

    // Update the loadData function to handle the toggle

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

            // Use GitHub Events API - this is what powers their contribution graph
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(daysFilter));

            const labels: string[] = [];
            const fullDates: string[] = [];
            const dateMap: Record<string, number> = {};
            const currentDate = new Date(start);

            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];
                labels.push(
                    currentDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                        timeZone: 'UTC'
                    })
                );
                fullDates.push(dateStr);
                dateMap[dateStr] = labels.length - 1;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Initialize daily counts
            const dailyCounts = new Array(labels.length).fill(0);
            const repoDailyCounts: Record<string, number[]> = {};
            const repoStats: RepoStat[] = [];

            const colors = [
                '#646cff', '#00d4aa', '#ff6b6b', '#ffa726', '#ab47bc',
                '#26c6da', '#d4e157', '#8d6e63', '#78909c', '#ec407a'
            ];

            // Get user events (this includes pushes, PRs, issues, etc.)
            let allEvents: GitHubEvent[] = [];
            let page = 1;
            let hasMoreEvents = true;

            console.log('=== FETCHING GITHUB EVENTS ===');

            while (hasMoreEvents) {
                const eventsRes = await fetchWithAuth(
                    `https://api.github.com/users/${username}/events?per_page=100&page=${page}`
                );

                if (!eventsRes.ok) break;

                const events: GitHubEvent[] = await eventsRes.json();

                if (events.length === 0) {
                    hasMoreEvents = false;
                } else {
                    allEvents = allEvents.concat(events);
                    console.log(`Fetched page ${page}: ${events.length} events`);
                    page++;

                    // Stop if we've gone too far back in time
                    const oldestEvent = new Date(events[events.length - 1].created_at);
                    if (oldestEvent < start) {
                        hasMoreEvents = false;
                    }

                    if (page > 10) break; // Safety limit
                }
            }

            console.log(`TOTAL events fetched: ${allEvents.length}`);

            // Process events to count contributions
            // Replace your event processing section with this:
            console.log('=== GITHUB EVENTS ANALYSIS ===');
            console.log(`Total events fetched: ${allEvents.length}`);

            // Detailed event breakdown
            const eventBreakdown: Record<string, number> = {};
            const repoEventBreakdown: Record<string, Record<string, number>> = {};

            allEvents.forEach(event => {
                const eventDate = new Date(event.created_at);
                const dateStr = eventDate.toISOString().split('T')[0];
                const index = dateMap[dateStr];

                if (index !== undefined) {
                    // Count events by type
                    eventBreakdown[event.type] = (eventBreakdown[event.type] || 0) + 1;

                    // Count events by repo and type
                    const repoName = event.repo.name.replace(`${username}/`, '');
                    if (!repoEventBreakdown[repoName]) {
                        repoEventBreakdown[repoName] = {};
                    }
                    repoEventBreakdown[repoName][event.type] = (repoEventBreakdown[repoName][event.type] || 0) + 1;

                    // Count these event types (similar to GitHub's contribution graph)
                    const contributionEvents = [
                        'PushEvent',           // Git pushes (contains multiple commits)
                        'PullRequestEvent',    // PR created/closed
                        'IssuesEvent',         // Issue created/closed
                        'CreateEvent',         // Branch/tag created
                        'DeleteEvent',         // Branch/tag deleted
                        'PullRequestReviewEvent', // PR review
                        'CommitCommentEvent',  // Comment on commit
                        'IssueCommentEvent'    // Comment on issue
                    ];

                    if (contributionEvents.includes(event.type)) {
                        dailyCounts[index]++;

                        // Track by repository
                        if (repoName) {
                            if (!repoDailyCounts[repoName]) {
                                repoDailyCounts[repoName] = new Array(labels.length).fill(0);
                            }
                            repoDailyCounts[repoName][index]++;
                        }
                    }
                }
            });

            console.log('=== EVENT TYPE BREAKDOWN ===');
            Object.entries(eventBreakdown).forEach(([type, count]) => {
                console.log(`${type}: ${count} events`);
            });

            console.log('=== REPO EVENT BREAKDOWN ===');
            Object.entries(repoEventBreakdown).forEach(([repo, types]) => {
                console.log(`${repo}:`);
                Object.entries(types).forEach(([type, count]) => {
                    console.log(`  - ${type}: ${count}`);
                });
            });

            // Count actual commits from PushEvents
            let totalCommitsFromPushes = 0;
            allEvents.forEach(event => {
                if (event.type === 'PushEvent' && event.payload.commits) {
                    totalCommitsFromPushes += event.payload.commits.length;
                }
            });

            console.log('=== COMMIT COUNT FROM PUSH EVENTS ===');
            console.log(`Total commits from PushEvents: ${totalCommitsFromPushes}`);

            console.log(`Total contributions: ${dailyCounts.reduce((sum, count) => sum + count, 0)}`);
            console.log('=== CONTRIBUTIONS PER DAY ===');
            labels.forEach((label, index) => {
                console.log(`${fullDates[index]} (${label}): ${dailyCounts[index]} contributions`);
            });

            // Also log repo daily counts
            console.log('=== REPO CONTRIBUTIONS PER DAY ===');
            Object.entries(repoDailyCounts).forEach(([repo, counts]) => {
                console.log(`${repo}:`);
                counts.forEach((count, index) => {
                    if (count > 0) {
                        console.log(`  - ${fullDates[index]}: ${count} contributions`);
                    }
                });
            });

            // Create datasets for each repository
            const datasets: ChartDataset[] = [];
            const repoNames = Object.keys(repoDailyCounts);

            repoNames.forEach((repoName, i) => {
                const repoData = repoDailyCounts[repoName];
                const totalCommits = repoData.reduce((sum, count) => sum + count, 0);

                if (totalCommits > 0) {
                    // Calculate repo stats
                    let maxCommits = 0;
                    let maxCommitsDate: string | null = null;
                    let lastCommitDate: string | null = null;

                    repoData.forEach((count, index) => {
                        if (count > maxCommits) {
                            maxCommits = count;
                            maxCommitsDate = fullDates[index];
                        }
                        if (count > 0) {
                            lastCommitDate = fullDates[index];
                        }
                    });

                    // Calculate streak
                    let streak = 0, maxStreak = 0;
                    for (const count of repoData) {
                        if (count > 0) {
                            streak++;
                            maxStreak = Math.max(maxStreak, streak);
                        } else {
                            streak = 0;
                        }
                    }

                    repoStats.push({
                        name: repoName,
                        totalCommits: totalCommits,
                        maxCommits,
                        maxCommitsDate,
                        maxConsecutiveDays: maxStreak,
                        lastCommitDate,
                        description: null,
                        createdAt: '',
                        color: colors[i % colors.length],
                        language: null,
                        stars: 0,
                        forks: 0,
                    });

                    datasets.push({
                        label: repoName,
                        data: repoData,
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
            });

            // Add total contributions dataset (only if showTotal is true)
            // if (showTotal) {
            //     datasets.unshift({
            //         label: 'Total Contributions',
            //         data: dailyCounts,
            //         backgroundColor: '#646cff20',
            //         borderColor: '#646cff',
            //         borderWidth: 3,
            //         pointBackgroundColor: '#646cff',
            //         pointBorderColor: '#ffffff',
            //         pointBorderWidth: 2,
            //         pointRadius: 4,
            //         pointHoverRadius: 6,
            //         fill: true,
            //         tension: 0.3,
            //     });
            // }

            console.log('=== GITHUB EVENTS ANALYSIS ===');
            console.log(`Total events processed: ${allEvents.length}`);
            console.log(`Total contributions: ${dailyCounts.reduce((sum, count) => sum + count, 0)}`);
            console.log('=== CONTRIBUTIONS PER DAY ===');
            labels.forEach((label, index) => {
                console.log(`${fullDates[index]} (${label}): ${dailyCounts[index]} contributions`);
            });

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

                    // Use UTC date to avoid timezone issues
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

