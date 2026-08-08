import { queryGraphQL, saveSVG, formatNumber, THEME } from './utils.js';

const QUERY = `
query userInfo($username: String!) {
  user(login: $username) {
    name
    login
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        stargazers {
          totalCount
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoryContributions
      restrictedContributionsCount
    }
  }
}
`;

function calculateGrade(stars, commits, prs, issues) {
  // A simple representation of github-readme-stats grading
  const score = stars * 4 + commits * 2 + prs * 3 + issues;
  if (score > 1000) return 'S+';
  if (score > 500) return 'S';
  if (score > 250) return 'A+';
  if (score > 100) return 'A';
  if (score > 50) return 'B+';
  return 'B';
}

async function main() {
  try {
    const username = process.env.GITHUB_REPOSITORY_OWNER || 'Bheemeswari497';
    console.log(`Fetching stats for ${username}...`);
    
    const data = await queryGraphQL(QUERY, { username });
    const user = data.user;
    
    if (!user) {
      throw new Error(`User not found: ${username}`);
    }

    const repos = user.repositories.nodes || [];
    const stars = repos.reduce((sum, repo) => sum + (repo.stargazers?.totalCount || 0), 0);
    
    const commits = (user.contributionsCollection?.totalCommitContributions || 0) +
                    (user.contributionsCollection?.restrictedContributionsCount || 0);
    const prs = user.contributionsCollection?.totalPullRequestContributions || 0;
    const issues = user.contributionsCollection?.totalIssueContributions || 0;
    const contributedTo = user.contributionsCollection?.totalRepositoryContributions || 0;
    
    const grade = calculateGrade(stars, commits, prs, issues);
    
    const svg = `
<svg width="495" height="195" viewBox="0 0 495 195" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.title}; }
    .stat { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.text}; }
    .label { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.textMuted}; }
    .grade { font: 800 36px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.accent}; }
    .grade-circle { stroke: ${THEME.accent}; stroke-width: 4.5; fill: none; }
    .grade-bg { stroke: ${THEME.border}; stroke-width: 4.5; fill: none; }
    .card { fill: ${THEME.bg}; stroke: ${THEME.border}; stroke-width: 1; rx: 6px; }
  </style>

  <rect width="494" height="194" x="0.5" y="0.5" class="card" />

  <!-- Header -->
  <g transform="translate(25, 35)">
    <text class="header">${user.name || user.login}'s GitHub Stats</text>
  </g>

  <!-- Stats Grid -->
  <g transform="translate(25, 55)">
    <!-- Stars -->
    <g transform="translate(0, 15)">
      <path d="M8 0L10.35 4.76L15.6 5.52L11.8 9.22L12.7 14.45L8 11.98L3.3 14.45L4.2 9.22L0.4 5.52L5.65 4.76L8 0Z" fill="${THEME.accent}"/>
      <text x="25" y="12" class="label">Total Stars Earned:</text>
      <text x="170" y="12" class="stat">${formatNumber(stars)}</text>
    </g>

    <!-- Commits -->
    <g transform="translate(0, 40)">
      <path d="M10.47 7.5a3.001 3.001 0 1 1-5.94 0L1 7.5a1 1 0 0 1 0-2h3.53a3.001 3.001 0 0 1 5.94 0L14 5.5a1 1 0 0 1 0 2l-3.53 0zM7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="${THEME.accent}"/>
      <text x="25" y="12" class="label">Total Commits:</text>
      <text x="170" y="12" class="stat">${formatNumber(commits)}</text>
    </g>

    <!-- PRs -->
    <g transform="translate(0, 65)">
      <path d="M7.177 3.007L4.957.787a.75.75 0 0 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.22-2.22H3.5a1.5 1.5 0 0 0-1.5 1.5V11.5a1.5 1.5 0 0 0 1.5 1.5h3.677l-2.22-2.22a.75.75 0 1 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06-1.06l2.22-2.22H3.5A3 3 0 0 1 .5 11.5V5.5a3 3 0 0 1 3-3h3.677z" fill="${THEME.accent}"/>
      <text x="25" y="12" class="label">Total PRs:</text>
      <text x="170" y="12" class="stat">${formatNumber(prs)}</text>
    </g>

    <!-- Issues -->
    <g transform="translate(0, 90)">
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm9 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-.25-6.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5z" fill="${THEME.accent}"/>
      <text x="25" y="12" class="label">Total Issues:</text>
      <text x="170" y="12" class="stat">${formatNumber(issues)}</text>
    </g>

    <!-- Contributed -->
    <g transform="translate(0, 115)">
      <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z" fill="${THEME.accent}"/>
      <text x="25" y="12" class="label">Contributed to:</text>
      <text x="170" y="12" class="stat">${formatNumber(contributedTo)}</text>
    </g>
  </g>

  <!-- Grade Badge -->
  <g transform="translate(380, 105)">
    <circle r="40" class="grade-bg" />
    <circle r="40" class="grade-circle" />
    <text x="0" y="12" text-anchor="middle" class="grade">${grade}</text>
  </g>
</svg>
`;

    saveSVG('github-stats.svg', svg);
  } catch (error) {
    console.error('Error generating stats SVG:', error);
    process.exit(1);
  }
}

main();
