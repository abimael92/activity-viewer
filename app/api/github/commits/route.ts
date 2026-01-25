import { NextResponse } from 'next/server';
import { githubRequest, getGitHubErrorMessage } from '@/lib/githubServer';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const username = searchParams.get('username');
	const repo = searchParams.get('repo');

	if (!username || !repo) {
		return NextResponse.json(
			{ error: 'Missing username or repo' },
			{ status: 400 }
		);
	}

	const since = searchParams.get('since');
	const until = searchParams.get('until');
	const perPage = searchParams.get('per_page');
	const page = searchParams.get('page');

	const params = new URLSearchParams();
	if (since) params.set('since', since);
	if (until) params.set('until', until);
	if (perPage) params.set('per_page', perPage);
	if (page) params.set('page', page);

	const response = await githubRequest(
		`/repos/${username}/${repo}/commits${params.toString() ? `?${params}` : ''}`
	);

	if (!response.ok) {
		const message = await getGitHubErrorMessage(response);
		return NextResponse.json({ error: message }, { status: response.status });
	}

	const data = await response.json();
	return NextResponse.json(data);
}
