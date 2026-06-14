const API_KEY = 'xxxxxxxxxxxxxx';

if (!API_KEY) {
  console.error('Error: FOOTBALL_DATA_API_KEY environment variable not set');
  console.error('Usage: FOOTBALL_DATA_API_KEY=your_key node football-today.js');
  process.exit(1);
}

async function getTodayMatches() {
  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Filter matches for today
    const todayMatches = data.matches.filter(match => {
      const matchDate = new Date(match.utcDate).toISOString().split('T')[0];
      return matchDate === today;
    });

    if (todayMatches.length === 0) {
      console.log(`\nNo matches scheduled for today (${today})`);
      return;
    }

    console.log(`\n📅 Matches for ${today}\n`);
    console.log('='.repeat(60));

    todayMatches.forEach(match => {
      const matchTime = new Date(match.utcDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      });

      const home = match.homeTeam.name;
      const away = match.awayTeam.name;
      const status = match.status;

      if (status === 'FINISHED') {
        const homeGoals = match.score.fullTime.home;
        const awayGoals = match.score.fullTime.away;
        console.log(`✅ ${home} ${homeGoals} - ${awayGoals} ${away}`);
        console.log(`   Status: ${status}`);
      } else if (status === 'IN_PLAY' || status === 'PAUSED') {
        const homeGoals = match.score.fullTime.home;
        const awayGoals = match.score.fullTime.away;
        console.log(`🔴 ${home} ${homeGoals} - ${awayGoals} ${away}`);
        console.log(`   Status: ${status} (${matchTime} UTC)`);
      } else if (status === 'SCHEDULED') {
        console.log(`⏱️  ${home} vs ${away}`);
        console.log(`   Scheduled for ${matchTime} UTC`);
      }

      console.log('-'.repeat(60));
    });

  } catch (error) {
    console.error('Error fetching matches:', error.message);
    process.exit(1);
  }
}

getTodayMatches();