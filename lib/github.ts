import type { DeploymentStatus, InactivityData, MergeStatus } from '@/types';

const CACHE_DURATION = 15 * 60 * 1000;

async function apiRequest<T>(
	endpoint: string,
	params: Record<string, string | number | undefined> = {}
): Promise<T> {
	const searchParams = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined) {
			searchParams.set(key, String(value));
		}
	});

	const url = searchParams.toString()
		? `/api/github/${endpoint}?${searchParams.toString()}`
		: `/api/github/${endpoint}`;

	try {
		const response = await fetch(url, { cache: 'no-store' });

		if (!response.ok) {
			const errorPayload = await response.json().catch(() => null);
			const message =
				errorPayload?.error || `GitHub API error: ${response.status}`;
			throw new Error(message);
		}

		return response.json() as Promise<T>;
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

export async function fetchGitHubUser(username: string) {
	return apiRequest<Record<string, unknown>>('user', { username });
}

export async function fetchGitHubRepos(
	username: string,
	options: { perPage?: number; sort?: string; page?: number } = {}
) {
	return apiRequest<unknown[]>('repos', {
		username,
		per_page: options.perPage,
		sort: options.sort,
		page: options.page,
	});
}

export async function fetchGitHubCommits(
	username: string,
	repo: string,
	options: {
		since?: string;
		until?: string;
		perPage?: number;
		page?: number;
	} = {}
) {
	return apiRequest<unknown[]>('commits', {
		username,
		repo,
		since: options.since,
		until: options.until,
		per_page: options.perPage,
		page: options.page,
	});
}

export async function fetchRepoStatus(username: string, repo: string) {
	return apiRequest<{ deployment: DeploymentStatus; mergeStatus: MergeStatus }>(
		'repo-status',
		{ username, repo }
	);
}

export async function loadInactivityData(
	username: string
): Promise<InactivityData> {
	const cacheKey = `${username}_inactivity`;
	const cachedData = getCachedData<InactivityData>(cacheKey);
	if (cachedData) return cachedData;

	try {
		const inactivityData = await apiRequest<InactivityData>('inactivity', {
			username,
		});
		setCachedData(cacheKey, inactivityData);
		return inactivityData;
	} catch {
		return { inactiveRepos: [], repos15Days: [] };
	}
}
