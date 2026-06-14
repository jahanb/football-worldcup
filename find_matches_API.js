import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

async function findMatchesInAPI() {
  try {
    console.log('\n📡 Fetching all matches from API...\n');

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION_CODE}/matches`,
      {
        headers: {
          'X-Auth-Token': API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const apiMatches = data.matches;

    console.log(`Found ${apiMatches.length} total matches in API\n`);

    // List of matches we're looking for
    const targetMatches = [
      { home: 'South Africa', away: 'South Korea' },
      { home: 'Bosnia & Herzegovina', away: 'Qatar' },
      { home: 'Bosnia and Herzegovina', away: 'Qatar' },
      { home: 'Morocco', away: 'Haiti' },
      { home: 'Paraguay', away: 'Australia' },
      { home: 'Ecuador', away: 'Germany' },
      { home: 'Tunisia', away: 'Netherlands' },
      { home: 'New Zealand', away: 'Belgium' },
      { home: 'Uruguay', away: 'Spain' },
      { home: 'Senegal', away: 'Iraq' },
      { home: 'Jordan', away: 'Argentina' },
      { home: 'DR Congo', away: 'Uzbekistan' },
      { home: 'Democratic Republic of the Congo', away: 'Uzbekistan' },
      { home: 'Croatia', away: 'Ghana' },
    ];

    console.log('🔍 SEARCHING FOR MISSING MATCHES\n');

    for (const target of targetMatches) {
      const found = apiMatches.find((m) => {
        if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
        
        const home = m.homeTeam.name.toLowerCase();
        const away = m.awayTeam.name.toLowerCase();
        const targetHome = target.home.toLowerCase();
        const targetAway = target.away.toLowerCase();

        return (
          (home === targetHome && away === targetAway) ||
          (home === targetAway && away === targetHome)
        );
      });

      if (found) {
        const homeTeam = found.homeTeam?.name || 'Unknown';
        const awayTeam = found.awayTeam?.name || 'Unknown';
        console.log(`✓ ${target.home} vs ${target.away}`);
        console.log(`  Found as: ${homeTeam} vs ${awayTeam}`);
        console.log(`  API ID: ${found.id}`);
        console.log(`  Status: ${found.status}`);
        console.log(`  Date: ${found.utcDate}\n`);
      } else {
        console.log(`✗ ${target.home} vs ${target.away} - NOT FOUND IN API\n`);
      }
    }

    // Also show all matches in June 2026 for reference
    console.log('\n📋 ALL MATCHES IN JUNE 2026 (for reference)\n');
    
    const juneMatches = apiMatches.filter((m) => {
      const date = new Date(m.utcDate);
      return date.getMonth() === 5 && date.getFullYear() === 2026; // June is month 5
    });

    console.log(`Total matches in June 2026: ${juneMatches.length}\n`);

    juneMatches.forEach((m) => {
      const homeTeam = m.homeTeam?.name || 'Unknown';
      const awayTeam = m.awayTeam?.name || 'Unknown';
      console.log(`${homeTeam} vs ${awayTeam}`);
      console.log(`  ID: ${m.id}`);
      console.log(`  Date: ${m.utcDate}\n`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findMatchesInAPI();