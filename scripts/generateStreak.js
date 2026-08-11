import { queryGraphQL, saveSVG, formatNumber, reportError } from './utils.js';

const YEARS_QUERY = `
query userYears($username: String!) {
  user(login: $username) {
    contributionsCollection {
      contributionYears
    }
  }
}
`;

const CALENDAR_QUERY = `
query userCalendar($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { month: 'short', day: 'numeric' };
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    options.year = 'numeric';
  }
  // format: "Aug 4" or "Dec 31, 2024"
  return date.toLocaleDateString('en-US', options);
}

async function main() {
  try {
    const username = process.env.GITHUB_REPOSITORY_OWNER || 
                     (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[0] : '') || 
                     'Bheemeswari497';
    console.log(`Fetching contribution years for ${username}...`);
    
    const yearsData = await queryGraphQL(YEARS_QUERY, { username });
    const years = yearsData.user?.contributionsCollection?.contributionYears || [];
    
    if (years.length === 0) {
      years.push(new Date().getFullYear());
    }

    // Sort years ascending to process chronologically
    years.sort((a, b) => a - b);
    
    let allDays = [];
    
    for (const year of years) {
      console.log(`Fetching contributions for year ${year}...`);
      const from = `${year}-01-01T00:00:00Z`;
      const to = `${year}-12-31T23:59:59Z`;
      const calendarData = await queryGraphQL(CALENDAR_QUERY, { username, from, to });
      
      const weeks = calendarData.user?.contributionsCollection?.contributionCalendar?.weeks || [];
      for (const week of weeks) {
        for (const day of week.contributionDays) {
          allDays.push({
            date: day.date,
            count: day.contributionCount
          });
        }
      }
    }

    // Deduplicate and sort chronologically by date
    const uniqueDaysMap = new Map();
    for (const day of allDays) {
      uniqueDaysMap.set(day.date, day.count);
    }
    const sortedDays = Array.from(uniqueDaysMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Dates string for today and yesterday (UTC)
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Filter out future calendar dates
    const pastAndTodayDays = sortedDays.filter(day => day.date <= todayStr);

    let totalContributions = 0;
    let longestStreak = { count: 0, start: '', end: '' };
    let currentStreak = { count: 0, start: '', end: '' };

    let tempStreak = null;

    for (const day of pastAndTodayDays) {
      totalContributions += day.count;

      if (day.count > 0) {
        if (!tempStreak) {
          tempStreak = { count: 1, start: day.date, end: day.date };
        } else {
          tempStreak.count++;
          tempStreak.end = day.date;
        }
        if (tempStreak.count > longestStreak.count) {
          longestStreak = { ...tempStreak };
        }
      } else {
        if (day.date !== todayStr) {
          tempStreak = null;
        }
      }
    }

    if (tempStreak && (tempStreak.end === todayStr || tempStreak.end === yesterdayStr)) {
      currentStreak = { ...tempStreak };
    }

    // Build the date ranges strings
    const currentStreakRange = currentStreak.count > 0
      ? `${formatDate(currentStreak.start)} - ${formatDate(currentStreak.end)}`
      : 'No active streak';
      
    const longestStreakRange = longestStreak.count > 0
      ? `${formatDate(longestStreak.start)} - ${formatDate(longestStreak.end)}`
      : 'No streak record';
      
    const totalRange = sortedDays.length > 0
      ? `${formatDate(sortedDays[0].date)} - Present`
      : 'No contributions';

    const svg = `
<svg width="495" height="195" viewBox="0 0 495 195" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .card { fill: #0f0914; stroke: #221230; stroke-width: 1; rx: 8px; }
    .val-pink { font: 800 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: #fe357e; }
    .val-yellow { font: 800 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: #facc15; }
    .label-pink { font: 700 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #e0437a; }
    .label-yellow { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #facc15; }
    .range { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: #9d8ba9; }
    .divider { stroke: #2c173b; stroke-width: 1.5; }
    .ring { stroke: #fe357e; stroke-width: 4.5; fill: none; }
    .fire-icon { fill: #fe357e; }
  </style>

  <rect width="494" height="194" x="0.5" y="0.5" class="card" />

  <!-- Total Contributions Panel -->
  <g transform="translate(0, 0)">
    <text x="82.5" y="72" text-anchor="middle" class="val-pink">${formatNumber(totalContributions)}</text>
    <text x="82.5" y="106" text-anchor="middle" class="label-pink">Total Contributions</text>
    <text x="82.5" y="134" text-anchor="middle" class="range">${totalRange}</text>
  </g>

  <!-- Left Divider -->
  <line x1="165" y1="35" x2="165" y2="160" class="divider" />

  <!-- Current Streak Panel (Center Highlighted) -->
  <g transform="translate(0, 0)">
    <!-- Ring Circle -->
    <circle cx="247.5" cy="72" r="34" class="ring" />
    
    <!-- Fire Icon resting on top of the circle -->
    <g transform="translate(247.5, 38)">
      <circle cx="0" cy="0" r="10" fill="#0f0914" />
      <path class="fire-icon" d="M0 -7C0 -7 2.5 -4 2.5 -1.5C2.5 0.6 1.4 2.3 0 2.3C-1.4 2.3 -2.5 0.6 -2.5 -1.5C-2.5 -2.4 -2 -3.6 -1.2 -4.8C-2.4 -3.6 -3.2 -1.9 -3.2 -0.3C-3.2 2.4 -1.0 4.6 1.7 4.6C4.4 4.6 6.6 2.4 6.6 -0.3C6.6 -3.2 3.7 -4.8 0 -7Z" transform="scale(1.4)"/>
    </g>

    <!-- Current Streak Value inside ring -->
    <text x="247.5" y="81" text-anchor="middle" class="val-yellow">${currentStreak.count}</text>

    <!-- Current Streak Label -->
    <text x="247.5" y="132" text-anchor="middle" class="label-yellow">Current Streak</text>

    <!-- Current Streak Range -->
    <text x="247.5" y="152" text-anchor="middle" class="range">${currentStreakRange}</text>
  </g>

  <!-- Right Divider -->
  <line x1="330" y1="35" x2="330" y2="160" class="divider" />

  <!-- Longest Streak Panel -->
  <g transform="translate(0, 0)">
    <text x="412.5" y="72" text-anchor="middle" class="val-pink">${longestStreak.count}</text>
    <text x="412.5" y="106" text-anchor="middle" class="label-pink">Longest Streak</text>
    <text x="412.5" y="134" text-anchor="middle" class="range">${longestStreakRange}</text>
  </g>
</svg>
`;

    saveSVG('github-streak.svg', svg);
  } catch (error) {
    reportError(error);
    process.exit(1);
  }
}

main();
