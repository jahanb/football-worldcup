import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Match from './models/Match.ts';

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

async function findAndAddFinalMatches() {
  try {
    // The 4 final matches
    const finalMatches = [
      { home: 'Czech Republic', away: 'Mexico' },
      { home: 'Bosnia & Herzegovina', away: 'Qatar' },
      { home: 'Turkey', away: 'USA' },
      { home: 'DR Congo', away: 'Uzbekistan' },
    ];

    console.log(`Finding externalIds for final ${finalMatches.length} matches...\n`);

    // Fetch all matches from API
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
    const apiMatches = data.matches.filter(m => m.homeTeam?.name && m.awayTeam?.name);

    console.log('🔍 SEARCHING IN API\n');

    const toAdd = [];
    const notFound = [];

    for (const match of finalMatches) {
      // Try multiple name variations
      const variations = [
        `${match.home} vs ${match.away}`,
        `${match.home.replace(' & ', ' and ')} vs ${match.away}`,
        `${match.home.replace(' and ', ' & ')} vs ${match.away}`,
      ];

      let found = null;

      for (const variation of variations) {
        const [varHome, varAway] = variation.split(' vs ');

        found = apiMatches.find((m) => {
          const mHome = m.homeTeam.name.toLowerCase();
          const mAway = m.awayTeam.name.toLowerCase();
          const searchHome = varHome.toLowerCase();
          const searchAway = varAway.toLowerCase();

          return (
            (mHome === searchHome && mAway === searchAway) ||
            (mHome === searchAway && mAway === searchHome)
          );
        });

        if (found) break;
      }

      if (found) {
        console.log(`✓ ${match.home} vs ${match.away}`);
        console.log(`  Found as: ${found.homeTeam.name} vs ${found.awayTeam.name}`);
        console.log(`  API ID: ${found.id}\n`);
        toAdd.push({ home: match.home, away: match.away, id: found.id });
      } else {
        console.log(`✗ ${match.home} vs ${match.away} - NOT FOUND IN API\n`);
        notFound.push(`${match.home} vs ${match.away}`);
      }
    }

    if (toAdd.length === 0) {
      console.log('⚠️  No matches found in API. These might not exist yet.\n');
      console.log('Options:');
      console.log('1. Wait for API to add them');
      console.log('2. Leave as is - batch job will work fine without them\n');
      process.exit(0);
    }

    console.log('📝 ADDING TO DATABASE\n');

    let added = 0;

    for (const match of toAdd) {
      try {
        const result = await Match.findOneAndUpdate(
          { 
            homeTeam: match.home, 
            awayTeam: match.away 
          },
          { $set: { externalId: match.id } },
          { new: true }
        );

        if (result) {
          console.log(`✓ ${match.home} vs ${match.away} → ${match.id}`);
          added++;
        } else {
          console.log(`✗ ${match.home} vs ${match.away} - Not found in DB`);
        }
      } catch (error) {
        console.log(`✗ ${match.home} vs ${match.away} - Error: ${error.message}`);
      }
    }

    console.log(`\n✅ SUMMARY\n`);
    console.log(`Successfully added: ${added}`);
    console.log(`Not found in API: ${notFound.length}`);

    if (notFound.length > 0) {
      console.log(`\nNot found in API:`);
      notFound.forEach((m) => console.log(`  - ${m}`));
      console.log('\nThese might not exist in the API yet.\n');
    }

    // Verify
    const stillMissing = await Match.find({ externalId: { $exists: false } });
    console.log(`Matches still without externalId: ${stillMissing.length}`);

    if (stillMissing.length === 0) {
      console.log('\n✅ SUCCESS! All matches now have externalId!\n');
    } else {
      console.log('\nRemaining matches without externalId:');
      stillMissing.forEach((m) => {
        console.log(`  - ${m.homeTeam} vs ${m.awayTeam}`);
      });
      console.log('\nYou can safely proceed - batch job will work fine.\n');
    }

    console.log('Next: Restart batch job');
    console.log('  pkill -f "tsx batch-externalid.js"');
    console.log('  nohup npx tsx batch-externalid.js > batch.log 2>&1 &\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => findAndAddFinalMatches());
