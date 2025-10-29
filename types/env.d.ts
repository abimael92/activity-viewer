// REPLACE everything in env.d.ts with this:
namespace NodeJS {
	interface ProcessEnv {
		readonly NEXT_PUBLIC_GITHUB_TOKEN: string;
	}
}
