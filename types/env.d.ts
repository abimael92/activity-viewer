// REPLACE everything in env.d.ts with this:
namespace NodeJS {
	interface ProcessEnv {
		readonly GITHUB_TOKEN: string;
	}
}
