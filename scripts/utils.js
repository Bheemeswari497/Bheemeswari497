import fs from 'fs';
import path from 'path';

/**
 * Fetch data from GitHub GraphQL API
 * @param {string} query GraphQL query
 * @param {object} variables Query variables
 * @returns {Promise<object>} Response data
 */
export async function queryGraphQL(query, variables = {}) {
  const token = (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) ||
                (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim());
  if (!token) {
    throw new Error('GH_TOKEN or GITHUB_TOKEN environment variable is not defined.');
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'github-stats-generator'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GitHub API HTTP Error ${response.status}:`, errorText);
    throw new Error(`GitHub API returned HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    console.error('GraphQL Errors:', JSON.stringify(json.errors, null, 2));
    throw new Error(`GitHub API error: ${json.errors[0].message}`);
  }

  return json.data;
}

/**
 * Format large numbers (e.g. 1500 -> 1.5k)
 * @param {number} num Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

/**
 * Write SVG content to target file, creating directories if needed
 * @param {string} filename Output filename in assets folder
 * @param {string} svgContent SVG string content
 */
export function saveSVG(filename, svgContent) {
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(assetsDir, filename), svgContent, 'utf-8');
  console.log(`Saved SVG: ${filename}`);
}

/**
 * Report error to console and GITHUB_STEP_SUMMARY if available
 * @param {Error|string} error 
 */
export function reportError(error) {
  const msg = error?.stack || error?.message || String(error);
  console.error('Error:', msg);
  console.log(`::error::${msg.replace(/\r?\n/g, '%0A')}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryMsg = `### ❌ Stats Generation Error\n\`\`\`\n${msg}\n\`\`\`\n`;
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMsg, 'utf-8');
    } catch (e) {
      console.error('Failed to write to GITHUB_STEP_SUMMARY:', e);
    }
  }
}

/**
 * Standard Theme Colors matching the user's profile "radical" theme
 */
export const THEME = {
  bg: '#0d1117',
  border: '#30363d',
  title: '#a78bfa',     // Lavender/purple Accent
  text: '#c9d1d9',      // Whiteish main text
  textMuted: '#8b949e', // Grey muted text
  accent: '#a78bfa',
  fire: '#f97316'       // Orange fire color for streak
};
