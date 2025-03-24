import { NextResponse } from 'next/server';

const repos = [
  {
    owner: 'Maddy-Custom',
    name: 'maddycustom-production',
  },
  {
    owner: 'Maddy-Custom',
    name: 'admin-maddy-custom',
  },
];

export async function GET() {
  try {
    // Helper function to fetch commits
    async function fetchCommits(owner, name) {
      try {
        console.debug(`Fetching commits for repository: ${owner}/${name}`);
        const resp = await fetch(
          `https://api.github.com/repos/${owner}/${name}/commits?per_page=10`,
          {
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
        if (!resp.ok) {
          throw new Error(`Failed to fetch commits for ${owner}/${name}`);
        }
        const data = await resp.json();
        console.debug(`Fetched ${data.length} commits for ${owner}/${name}`);
        const filtered = data.filter((commit) => {
          const firstLine = commit.commit.message.split('\n')[0];
          return firstLine.length >= 10;
        });
        const simplified = filtered.slice(0, 3).map((commit) => ({
          sha: commit.sha,
          message: commit.commit.message.split('\n')[0],
          date: commit.commit.author.date,
        }));
        console.debug(`Filtered and simplified commits for ${owner}/${name}`);
        return simplified;
      } catch (error) {
        console.error(`Error fetching commits for ${owner}/${name}:`, error);
        throw error;
      }
    }

    // Helper function to fetch branches
    async function fetchBranches(owner, name) {
      try {
        console.debug(`Fetching branches for repository: ${owner}/${name}`);
        const resp = await fetch(
          `https://api.github.com/repos/${owner}/${name}/branches?per_page=50`,
          {
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
        if (!resp.ok) {
          throw new Error(`Failed to fetch branches for ${owner}/${name}`);
        }
        const data = await resp.json();
        const featureBranches = data
          .map((b) => b.name)
          .filter((branchName) => !['main', 'develop', 'feature/custom-stickers'].includes(branchName));
        console.debug(`Fetched ${featureBranches.length} feature branches for ${owner}/${name}`);
        return featureBranches;
      } catch (error) {
        console.error(`Error fetching branches for ${owner}/${name}:`, error);
        throw error;
      }
    }

    const results = [];
    for (const { owner, name } of repos) {
      try {
        console.debug(`Processing repository: ${owner}/${name}`);
        const [commits, branches] = await Promise.all([
          fetchCommits(owner, name),
          fetchBranches(owner, name),
        ]);
        results.push({
          repo: `${owner}/${name}`,
          commits,
          branches,
        });
        console.debug(`Processed repository: ${owner}/${name}`);
      } catch (error) {
        console.error(`Error processing repository ${owner}/${name}:`, error);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return NextResponse.json(
      { error: 'Could not fetch data' },
      { status: 500 }
    );
  }
}

