import { NextResponse } from 'next/server';
import { getRepoStatus } from '@/lib/repoStatus';

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

	try {
		const status = await getRepoStatus(username, repo);
		return NextResponse.json(status);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to load repo status';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
