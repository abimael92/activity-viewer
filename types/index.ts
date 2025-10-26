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

export interface RepoStat {
	name: string;
	maxCommits: number;
	maxCommitsDate: string | null;
	totalCommits: number;
	color: string;
	createdAt: string;
	maxConsecutiveDays: number;
	description: string | null;
	lastCommitDate: string | null;
	language: string | null;
	stars: number;
	forks: number;
	expanded?: boolean;
}

export interface InactiveRepo {
	name: string;
	reason: string;
	lastCommit: Date | null;
	daysWithoutCommits: number | string;
}

export interface InactivityData {
	inactiveRepos: InactiveRepo[];
	repos15Days: InactiveRepo[];
}

export interface ChartData {
	datasets: any[];
	repoStats: RepoStat[];
	labels: string[];
	fullDates: string[];
}
