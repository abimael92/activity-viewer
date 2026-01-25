import { NextResponse } from 'next/server';
import { githubRequest, getGitHubErrorMessage } from '@/lib/githubServer';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const username = searchParams.get('username');

	if (!username) {
		return NextResponse.json(
			{ error: 'Missing username' },
			{ status: 400 }
		);
	}

	const perPage = searchParams.get('per_page');
	const sort = searchParams.get('sort');
	const page = searchParams.get('page');

	const params = new URLSearchParams();
	if (perPage) params.set('per_page', perPage);
	if (sort) params.set('sort', sort);
	if (page) params.set('page', page);

	const response = await githubRequest(
		`/users/${username}/repos${params.toString() ? `?${params}` : ''}`
	);

	if (!response.ok) {
		const message = await getGitHubErrorMessage(response);
		return NextResponse.json({ error: message }, { status: response.status });
	}

	const data = await response.json();
	return NextResponse.json(data);
}
