import 'server-only';
import { githubRequest } from './githubServer';

export type DeploymentStatus = {
	deployed: boolean;
	deploymentType?:
		| 'vercel'
		| 'netlify'
		| 'heroku'
		| 'render'
		| 'railway'
		| 'github-pages'
		| 'other';
	deploymentUrl?: string;
	lastDeployment?: string;
	lastDeploymentCommitHash?: string;
	lastDeploymentCommitMessage?: string;
};

export type MergeStatus = {
	lastMergeSuccess: boolean | null;
	lastMergeDate?: string;
	lastMergeTitle?: string;
	mergeFailureCount: number;
	lastMergeCommitHash?: string;
	lastMergeCommitMessage?: string;
};

type PullRequest = {
	merged_at: string | null;
	merge_commit_sha: string;
	title: string;
	draft: boolean;
};

export const checkDeploymentStatus = async (
	username: string,
	repoName: string
): Promise<DeploymentStatus> => {
	try {
		const checks = [
			// Check for deployment config files
			{
				path: `/repos/${username}/${repoName}/contents/vercel.json`,
				type: 'vercel' as const,
				urlPattern: `https://${repoName}.vercel.app`,
			},
			{
				path: `/repos/${username}/${repoName}/contents/netlify.toml`,
				type: 'netlify' as const,
				urlPattern: `https://${repoName}.netlify.app`,
			},
			{
				path: `/repos/${username}/${repoName}/contents/heroku.yml`,
				type: 'heroku' as const,
				urlPattern: `https://${repoName}.herokuapp.com`,
			},
			{
				path: `/repos/${username}/${repoName}/contents/render.yaml`,
				type: 'render' as const,
				urlPattern: `https://${repoName}.onrender.com`,
			},
			{
				path: `/repos/${username}/${repoName}/contents/railway.json`,
				type: 'railway' as const,
				urlPattern: '',
			},
		];

		// Check GitHub Pages status
		let deploymentType: DeploymentStatus['deploymentType'];
		let deploymentUrl: string | undefined;

		try {
			const pagesRes = await githubRequest(
				`/repos/${username}/${repoName}/pages`
			);
			if (pagesRes.ok) {
				const pagesData = await pagesRes.json();
				if (pagesData.status === 'built') {
					deploymentType = 'github-pages';
					deploymentUrl = `https://${username}.github.io/${repoName}`;
				}
			}
		} catch (error) {
			// Ignore - no GitHub Pages
		}

		// Check deployment config files
		for (const check of checks) {
			try {
				const res = await githubRequest(check.path);
				if (res.ok) {
					deploymentType = check.type;
					if (check.urlPattern && !deploymentUrl) {
						deploymentUrl = check.urlPattern;
					}
					break;
				}
			} catch (error) {
				continue;
			}
		}

		// Check package.json for deployment scripts
		if (!deploymentType) {
			try {
				const packageRes = await githubRequest(
					`/repos/${username}/${repoName}/contents/package.json`
				);
				if (packageRes.ok) {
					const packageData = await packageRes.json();
					const packageContent = JSON.parse(atob(packageData.content));
					const scripts = packageContent.scripts || {};

					const deployScripts = ['deploy', 'build', 'predeploy', 'postdeploy'];
					const hasDeployScript = Object.keys(scripts).some((script) =>
						deployScripts.some((deployScript) => script.includes(deployScript))
					);

					if (hasDeployScript) {
						deploymentType = 'other';
					}
				}
			} catch (error) {
				// Ignore - no package.json or can't parse
			}
		}

		// Check README for deployment URLs
		if (!deploymentUrl) {
			try {
				const readmeRes = await githubRequest(
					`/repos/${username}/${repoName}/readme`
				);
				if (readmeRes.ok) {
					const readme = await readmeRes.json();
					const readmeContent = atob(readme.content);

					const deploymentPatterns = [
						/(https?:\/\/[^\s\)]*(vercel\.app|netlify\.app|github\.io|herokuapp\.com|onrender\.com|railway\.app)[^\s\)]*)/g,
						/Live Demo.*?(https?:\/\/[^\s\)]+)/i,
						/Deployed at.*?(https?:\/\/[^\s\)]+)/i,
						/Visit.*?(https?:\/\/[^\s\)]+)/i,
					];

					for (const pattern of deploymentPatterns) {
						const matches = readmeContent.match(pattern);
						if (matches && matches.length > 0) {
							deploymentUrl = matches[0]
								.replace(/[^\w\s:\/.-]|Live Demo:|Deployed at:|Visit:/gi, '')
								.trim();
							if (!deploymentType) deploymentType = 'other';
							break;
						}
					}
				}
			} catch (error) {
				// Ignore - no README or can't parse
			}
		}

		// Get latest commit info for deployment
		let lastDeploymentCommitHash: string | undefined;
		let lastDeploymentCommitMessage: string | undefined;
		let lastDeployment: string | undefined;

		if (deploymentType) {
			try {
				const commitsRes = await githubRequest(
					`/repos/${username}/${repoName}/commits?per_page=1`
				);
				if (commitsRes.ok) {
					const commits = await commitsRes.json();
					if (commits.length > 0) {
						const latestCommit = commits[0];
						lastDeploymentCommitHash = latestCommit.sha;
						lastDeploymentCommitMessage = latestCommit.commit?.message || '';
						lastDeployment = latestCommit.commit?.author?.date || new Date().toISOString();
					}
				}
			} catch (error) {
				// Ignore - use current date as fallback
				lastDeployment = new Date().toISOString();
			}
		}

		return {
			deployed: !!deploymentType,
			deploymentType,
			deploymentUrl,
			lastDeployment: lastDeployment || (deploymentType ? new Date().toISOString() : undefined),
			lastDeploymentCommitHash,
			lastDeploymentCommitMessage,
		};
	} catch (error) {
		console.error(`Error checking deployment for ${repoName}:`, error);
		return {
			deployed: false,
		};
	}
};

export const checkMergeStatus = async (
	username: string,
	repoName: string
): Promise<MergeStatus> => {
	try {
		// Get latest pull requests
		const prsRes = await githubRequest(
			`/repos/${username}/${repoName}/pulls?state=closed&sort=updated&direction=desc&per_page=5`
		);

		if (!prsRes.ok) {
			return {
				lastMergeSuccess: null,
				mergeFailureCount: 0,
			};
		}

		const prs = await prsRes.json();

		// Find the last merged PR
		const lastMergedPR = prs.find((pr: PullRequest) => pr.merged_at);

		if (!lastMergedPR) {
			return {
				lastMergeSuccess: null,
				mergeFailureCount: 0,
			};
		}

		// Check the status of the merge commit
		let mergeSuccess = true;

		try {
			// Check combined status
			const statusRes = await githubRequest(
				`/repos/${username}/${repoName}/commits/${lastMergedPR.merge_commit_sha}/status`
			);

			if (statusRes.ok) {
				const status = await statusRes.json();
				mergeSuccess = status.state === 'success';
			}

			// Check check runs
			const checkRunsRes = await githubRequest(
				`/repos/${username}/${repoName}/commits/${lastMergedPR.merge_commit_sha}/check-runs`
			);

			if (checkRunsRes.ok) {
				const checkRuns = await checkRunsRes.json();
				if (checkRuns.total_count > 0) {
					const allPassed = checkRuns.check_runs.every(
						(run: { conclusion: string }) =>
							run.conclusion === 'success' || run.conclusion === 'skipped'
					);
					if (!allPassed) mergeSuccess = false;
				}
			}
		} catch (error) {
			// If we can't check status, assume success
			mergeSuccess = true;
		}

		// Count recent merge failures
		let mergeFailureCount = 0;
		try {
			const allPrsRes = await githubRequest(
				`/repos/${username}/${repoName}/pulls?state=closed&sort=updated&direction=desc&per_page=20`
			);
			if (allPrsRes.ok) {
				const allPrs = await allPrsRes.json();
				mergeFailureCount =
					allPrs.filter(
						(pr: PullRequest) =>
							pr.merged_at && pr.merge_commit_sha && !pr.draft
					).length - (mergeSuccess ? 1 : 0);
			}
		} catch (error) {
			// Ignore error for failure count
		}

		// Get commit message from merge commit hash
		let lastMergeCommitMessage: string | undefined;
		if (lastMergedPR.merge_commit_sha) {
			try {
				const commitRes = await githubRequest(
					`/repos/${username}/${repoName}/commits/${lastMergedPR.merge_commit_sha}`
				);
				if (commitRes.ok) {
					const commit = await commitRes.json();
					lastMergeCommitMessage = commit.commit?.message || '';
				}
			} catch (error) {
				// Ignore - use PR title as fallback
			}
		}

		return {
			lastMergeSuccess: mergeSuccess,
			lastMergeDate: lastMergedPR.merged_at,
			lastMergeTitle: lastMergedPR.title,
			mergeFailureCount,
			lastMergeCommitHash: lastMergedPR.merge_commit_sha,
			lastMergeCommitMessage: lastMergeCommitMessage || lastMergedPR.title,
		};
	} catch (error) {
		console.error(`Error checking merge status for ${repoName}:`, error);
		return {
			lastMergeSuccess: null,
			mergeFailureCount: 0,
		};
	}
};

// Combined function to get both statuses
export const getRepoStatus = async (
	username: string,
	repoName: string
): Promise<{
	deployment: DeploymentStatus;
	mergeStatus: MergeStatus;
}> => {
	const [deployment, mergeStatus] = await Promise.all([
		checkDeploymentStatus(username, repoName),
		checkMergeStatus(username, repoName),
	]);

	return { deployment, mergeStatus };
};
