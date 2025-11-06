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
