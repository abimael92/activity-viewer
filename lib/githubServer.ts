import 'server-only';

const GITHUB_API_BASE = 'https://api.github.com';

type GitHubRequestOptions = RequestInit & {
	headers?: HeadersInit;
};

export async function githubRequest(
	path: string,
	options: GitHubRequestOptions = {}
): Promise<Response> {
	const url = `${GITHUB_API_BASE}${path}`;
	const headers = new Headers(options.headers);
	const token = process.env.GITHUB_TOKEN;

	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	headers.set('User-Agent', 'GitHub-Commit-Visualizer');
	headers.set('Accept', 'application/vnd.github.v3+json');

	return fetch(url, {
		...options,
		headers,
		cache: 'no-store',
	});
}

export async function getGitHubErrorMessage(
	response: Response
): Promise<string> {
	if (response.status === 403) {
		const remaining = response.headers.get('X-RateLimit-Remaining');
		const resetTime = response.headers.get('X-RateLimit-Reset');

		if (remaining === '0' && resetTime) {
			const resetDate = new Date(Number(resetTime) * 1000);
			const now = new Date();
			const minutesUntilReset = Math.ceil(
				(resetDate.getTime() - now.getTime()) / (1000 * 60)
			);
			return `GitHub API rate limit exceeded. Resets in ${minutesUntilReset} minutes (${resetDate.toLocaleTimeString()})`;
		}
	}

	if (response.status === 404) {
		return 'User or repository not found';
	}

	if (response.status === 429) {
		return 'Too many requests. Please wait a moment before trying again.';
	}

	switch (response.status) {
		case 401:
			return 'Unauthorized: missing or invalid GitHub token';
		case 403:
			return 'Forbidden: token has no access or rate limit exceeded';
		case 422:
			return 'Unprocessable entity: invalid request parameters';
		default: {
			const payload = await response.json().catch(() => null);
			if (payload?.message) {
				return payload.message;
			}
			return `GitHub API error: ${response.status}`;
		}
	}
}
