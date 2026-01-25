import { NextResponse } from 'next/server';
import { githubRequest, getGitHubErrorMessage } from '@/lib/githubServer';
import type { InactivityData } from '@/types';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const username = searchParams.get('username');

	if (!username) {
		return NextResponse.json(
			{ error: 'Missing username' },
			{ status: 400 }
		);
	}

	try {
		const repoRes = await githubRequest(
			`/users/${username}/repos?sort=updated&per_page=100`
		);

		if (!repoRes.ok) {
			const message = await getGitHubErrorMessage(repoRes);
			return NextResponse.json({ error: message }, { status: repoRes.status });
		}

		const repos = await repoRes.json();
		const inactiveRepos: InactivityData['inactiveRepos'] = [];
		const repos15Days: InactivityData['repos15Days'] = [];

		const delay = (ms: number) =>
			new Promise((resolve) => setTimeout(resolve, ms));

		for (const repo of repos) {
			try {
				const commitsRes = await githubRequest(
					`/repos/${username}/${repo.name}/commits?per_page=1`
				);

				if (commitsRes.status === 409 || commitsRes.status === 404) {
					inactiveRepos.push({
						name: repo.name,
						reason:
							commitsRes.status === 409
								? 'Empty repository'
								: 'Repository not found',
						lastCommit: null,
						daysWithoutCommits: 'N/A',
					});
					continue;
				}

				if (!commitsRes.ok) continue;

				const commits = await commitsRes.json();

				let lastCommitDate: Date | null = null;
				let daysWithoutCommits: number | string = 'N/A';

				if (commits.length > 0 && commits[0]?.commit?.author?.date) {
					lastCommitDate = new Date(commits[0].commit.author.date);
					const today = new Date();
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

				if (
					daysWithoutCommits === 'N/A' ||
					(typeof daysWithoutCommits === 'number' && daysWithoutCommits >= 21)
				) {
					inactiveRepos.push({
						...repoData,
						reason: 'No commits in last 21 days',
					});
				} else if (
					typeof daysWithoutCommits === 'number' &&
					daysWithoutCommits >= 15
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

		return NextResponse.json({ inactiveRepos, repos15Days });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to load inactivity data';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
