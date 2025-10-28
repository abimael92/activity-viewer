interface InactivityData {
	inactiveRepos: {
		name: string;
		reason: string;
		lastCommit: Date | null;
		daysWithoutCommits: number | string;
	}[];
	repos15Days: {
		name: string;
		reason: string;
		lastCommit: Date | null;
		daysWithoutCommits: number | string;
	}[];
}

const CACHE_DURATION = 15 * 60 * 1000;

export async function fetchWithAuth(url: string): Promise<Response> {
	try {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
				'User-Agent': 'GitHub-Commit-Visualizer',
				Accept: 'application/vnd.github.v3+json',
			},
		});

		if (response.status === 403) {
			const remaining = response.headers.get('X-RateLimit-Remaining');
			const resetTime = response.headers.get('X-RateLimit-Reset');

			if (remaining === '0') {
				const resetDate = new Date(Number(resetTime) * 1000);
				const now = new Date();
				const minutesUntilReset = Math.ceil(
					(resetDate.getTime() - now.getTime()) / (1000 * 60)
				);
				throw new Error(
					`GitHub API rate limit exceeded. Resets in ${minutesUntilReset} minutes (${resetDate.toLocaleTimeString()})`
				);
			}
		}

		if (response.status === 404) {
			throw new Error('User or repository not found');
		}

		if (response.status === 429) {
			throw new Error(
				'Too many requests. Please wait a moment before trying again.'
			);
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return response;
	} catch (error) {
		if (
			error instanceof Error &&
			error.name === 'TypeError' &&
			error.message.includes('fetch')
		) {
			throw new Error('Network error: Please check your internet connection');
		}
		throw error;
	}
}

export function getCachedData<T>(key: string): T | null {
	try {
		if (typeof window === 'undefined') return null;
		const cached = localStorage.getItem(`gh_${key}`);
		if (!cached) return null;

		const { data, timestamp } = JSON.parse(cached);
		if (Date.now() - timestamp > CACHE_DURATION) {
			localStorage.removeItem(`gh_${key}`);
			return null;
		}

		return data as T;
	} catch {
		return null;
	}
}

export function setCachedData<T>(key: string, data: T): void {
	try {
		if (typeof window === 'undefined') return;
		localStorage.setItem(
			`gh_${key}`,
			JSON.stringify({
				data,
				timestamp: Date.now(),
			})
		);
	} catch (error) {
		console.warn('Could not cache data:', error);
	}
}

export async function loadInactivityData(
	username: string
): Promise<InactivityData> {
	const cacheKey = `${username}_inactivity`;
	const cachedData = getCachedData<InactivityData>(cacheKey);
	if (cachedData) return cachedData;

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const twentyOneDaysAgo = new Date();
	twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

	const fifteenDaysAgo = new Date();
	fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

	try {
		const repoRes = await fetchWithAuth(
			`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`
		);

		if (!repoRes.ok) return { inactiveRepos: [], repos15Days: [] };

		const repos = await repoRes.json();
		const inactiveRepos: InactivityData['inactiveRepos'] = [];
		const repos15Days: InactivityData['repos15Days'] = [];

		const delay = (ms: number) =>
			new Promise((resolve) => setTimeout(resolve, ms));

		for (const repo of repos) {
			try {
				const commitsRes = await fetchWithAuth(
					`https://api.github.com/repos/${username}/${
						repo.name
					}/commits?since=${thirtyDaysAgo.toISOString()}&per_page=100`
				);

				if (commitsRes.status === 409 || commitsRes.status === 404) {
					inactiveRepos.push({
						name: repo.name,
						reason:
							commitsRes.status === 409
								? 'Empty repository'
								: 'Repository not found',
						lastCommit: null,
						daysWithoutCommits: 'N/A', // always string | number
					});
					continue;
				}

				if (!commitsRes.ok) continue;

				const commits = await commitsRes.json();
				const today = new Date();

				let lastCommitDate: Date | null = null;
				let hasCommitsInLast21Days = false;
				let hasCommitsInLast15Days = false;
				let daysWithoutCommits: number | string = 'N/A';

				if (Array.isArray(commits)) {
					for (const c of commits) {
						const commitDateStr = c.commit?.author?.date;
						if (!commitDateStr) continue;

						const commitDate = new Date(commitDateStr);

						if (commitDate >= twentyOneDaysAgo) hasCommitsInLast21Days = true;
						if (commitDate >= fifteenDaysAgo) hasCommitsInLast15Days = true;

						if (!lastCommitDate || commitDate > lastCommitDate) {
							lastCommitDate = commitDate;
						}
					}
				}

				if (lastCommitDate) {
					daysWithoutCommits = Math.floor(
						(today.getTime() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24)
					);
				}

				const repoData = {
					name: repo.name,
					reason: '',
					lastCommit: lastCommitDate,
					daysWithoutCommits,
				};

				if ((daysWithoutCommits as number) > 21 || !hasCommitsInLast21Days) {
					inactiveRepos.push({
						...repoData,
						reason: 'No commits in last 21 days',
					});
				} else if (
					(daysWithoutCommits as number) > 15 &&
					!hasCommitsInLast15Days
				) {
					repos15Days.push({
						...repoData,
						reason: 'No commits in last 15 days',
					});
				}

				await delay(300);
			} catch {
				continue;
			}
		}

		const inactivityData: InactivityData = { inactiveRepos, repos15Days };
		setCachedData(cacheKey, inactivityData);
		return inactivityData;
	} catch {
		return { inactiveRepos: [], repos15Days: [] };
	}
}
