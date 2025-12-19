export interface Repo {
	name: string;
	created_at: string;
	description: string | null;
	language: string | null;
	stargazers_count: number;
	forks_count: number;
}

export interface Commit {
	commit: {
		author: {
			date: string;
		};
	};
}

interface CommitData {
	hash?: string;
	message: string;
	date: string;
	author?: string;
}

// Add to your types.ts file
export interface DeploymentStatus {
	deployed: boolean;
	deploymentType?:
		| 'vercel'
		| 'netlify'
		| 'github-pages'
		| 'heroku'
		| 'render'
		| 'railway'
		| 'other';
	deploymentUrl?: string;
	lastDeployment?: string;
}

export interface MergeStatus {
	lastMergeSuccess: boolean | null; // null means no merge data
	lastMergeDate?: string;
	lastMergeTitle?: string;
	mergeFailureCount?: number;
	lastMergeCommitHash?: string;
}

export interface RepoStat {
	name: string;
	maxCommits: number;
	maxCommitsDate: string | null;
	totalCommits: number;
	color: string;
	createdAt: string;
	maxConsecutiveDays: number;
	description: string | null;
	language?: string;
	lastCommitDate?: string | null;
	stars: number;
	forks: number;
	expanded?: boolean;
	loading: boolean;
	lastDayCommits?: CommitData[];
	deployment?: DeploymentStatus; // Add this
	mergeStatus?: MergeStatus; // Add this
}

export interface InactiveRepo {
	[key: string]: unknown;
	name: string;
	reason: string;
	lastCommit: Date | null;
	daysWithoutCommits: number | string;
}

export interface InactivityData {
	inactiveRepos: InactiveRepo[];
	repos15Days: InactiveRepo[];
}

export interface ChartDataset {
	label: string;
	data: number[];
	backgroundColor: string;
	borderColor: string;
	borderWidth: number;
	pointBackgroundColor: string;
	pointBorderColor: string;
	pointBorderWidth: number;
	pointRadius: number;
	pointHoverRadius: number;
	fill: boolean;
	tension: number;
}

export interface ChartData {
	datasets: ChartDataset[];
	repoStats: RepoStat[];
	labels: string[];
	fullDates: string[];
}

export interface GitHubEvent {
	id: string;
	type: string;
	actor: {
		id: number;
		login: string;
		display_login?: string;
		gravatar_id: string;
		url: string;
		avatar_url: string;
	};
	repo: {
		id: number;
		name: string;
		url: string;
	};
	payload: {
		action?: string;
		ref?: string;
		ref_type?: string;
		master_branch?: string;
		description?: string;
		pusher_type?: string;
		push_id?: number;
		size?: number;
		distinct_size?: number;
		head?: string;
		before?: string;
		commits?: Array<{
			sha: string;
			author: {
				email: string;
				name: string;
			};
			message: string;
			distinct: boolean;
			url: string;
		}>;
		issue?: {
			number: number;
			title: string;
			user: {
				login: string;
				id: number;
			};
		};
		pull_request?: {
			number: number;
			title: string;
			user: {
				login: string;
				id: number;
			};
		};
		comment?: {
			id: number;
			user: {
				login: string;
				id: number;
			};
			body: string;
		};
	};
	public: boolean;
	created_at: string;
	org?: {
		id: number;
		login: string;
		gravatar_id: string;
		url: string;
		avatar_url: string;
	};
}
