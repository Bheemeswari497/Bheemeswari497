import { queryGraphQL, saveSVG, formatNumber, THEME } from './utils.js';

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
    .title { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.title}; }
    .val { font: 800 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.accent}; }
    .val-active { font: 800 30px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.accent}; }
    .label { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.text}; }
    .range { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.textMuted}; }
    .divider { stroke: ${THEME.border}; stroke-width: 1; }
    .card { fill: ${THEME.bg}; stroke: ${THEME.border}; stroke-width: 1; rx: 6px; }
    .fire-icon { fill: ${THEME.fire}; }
  </style>

  <rect width="494" height="194" x="0.5" y="0.5" class="card" />

  <!-- Total Contributions Panel -->
  <g transform="translate(10, 0)">
    <g transform="translate(10, 45)">
      <!-- Total contributions icon/circle placeholder or decoration -->
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${THEME.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    </g>
    <g transform="translate(45, 50)">
      <text class="val">${formatNumber(totalContributions)}</text>
      <text y="22" class="label">Total Contributions</text>
      <text y="38" class="range">${totalRange}</text>
    </g>
  </g>

  <line x1="165" y1="35" x2="165" y2="160" class="divider" />

  <!-- Current Streak Panel -->
  <g transform="translate(165, 0)">
    <g transform="translate(15, 45)">
      <!-- Orange Fire icon -->
      <path class="fire-icon" d="M12 2C12 2 15 5.5 15 8.5C15 10.98 13.66 13 12 13C10.34 13 9 10.98 9 8.5C9 7.39 9.5 5.92 10.5 4.5C9 6 8 8 8 10C8 13.31 10.69 16 14 16C17.31 16 20 13.31 20 10C20 6.5 16.5 4.5 12 2Z" transform="scale(1.3) translate(-2, -2)"/>
    </g>
    <g transform="translate(50, 50)">
      <text class="val-active">${currentStreak.count}</text>
      <text y="22" class="label">Current Streak</text>
      <text y="38" class="range">${currentStreakRange}</text>
    </g>
  </g>

  <line x1="330" y1="35" x2="330" y2="160" class="divider" />

  <!-- Longest Streak Panel -->
  <g transform="translate(330, 0)">
    <g transform="translate(15, 45)">
      <!-- Trophy icon -->
      <path fill="${THEME.accent}" d="M12 2a4 4 0 0 0-4 4v3.5a4 4 0 0 0 3.5 3.97V15H10a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2h-1.5v-1.53A4 4 0 0 0 16 9.5V6a4 4 0 0 0-4-4zm-3 4a2 2 0 0 1 2-2v2.5a.5.5 0 0 0 .5.5.5.5 0 0 0 .5-.5V4a2 2 0 0 1 2 2v2.5H9V6zm5.5 3.5H9.5a2.5 2.5 0 0 0 5 0z" transform="scale(1.3) translate(-2, -2)"/>
    </g>
    <g transform="translate(50, 50)">
      <text class="val">${longestStreak.count}</text>
      <text y="22" class="label">Longest Streak</text>
      <text y="38" class="range">${longestStreakRange}</text>
    </g>
  </g>
</svg>
`;

    saveSVG('github-streak.svg', svg);
  } catch (error) {
    console.error('Error generating streak SVG:', error);
    process.exit(1);
  }
}

main();
