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

async function findAndAddNewMatches() {
  try {
    // Get the 6 new matches without externalId
    const newMatches = [
      'Czech Republic vs Mexico',
      'Bosnia & Herzegovina vs Qatar',
      'Turkey vs USA',
      'Norway vs France',
      'DR Congo vs Uzbekistan',
      'Panama vs England'
    ];

    console.log(`Finding externalIds for ${newMatches.length} matches...\n`);

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
    const apiMatches = data.matches;

    console.log('🔍 SEARCHING FOR MATCHES IN API\n');

    const toAdd = [];
    const notFound = [];

    for (const matchName of newMatches) {
      const [home, away] = matchName.split(' vs ');

      // Try to find in API with various name variations
      const variations = [
        { home, away },
        { home: home.replace(' and ', ' & '), away },
        { home: home.replace(' & ', ' and '), away },
      ];

      let found = null;

      for (const variation of variations) {
        found = apiMatches.find((m) => {
          if (!m.homeTeam?.name || !m.awayTeam?.name) return false;

          const mHome = m.homeTeam.name.toLowerCase();
          const mAway = m.awayTeam.name.toLowerCase();
          const varHome = variation.home.toLowerCase();
          const varAway = variation.away.toLowerCase();

          return (
            (mHome === varHome && mAway === varAway) ||
            (mHome === varAway && mAway === varHome)
          );
        });

        if (found) break;
      }

      if (found) {
        console.log(`✓ ${matchName}`);
        console.log(`  Found as: ${found.homeTeam.name} vs ${found.awayTeam.name}`);
        console.log(`  API ID: ${found.id}\n`);
        toAdd.push({ name: matchName, home, away, id: found.id });
      } else {
        console.log(`✗ ${matchName} - NOT FOUND\n`);
        notFound.push(matchName);
      }
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
          console.log(`✓ ${match.name} → ${match.id}`);
          added++;
        } else {
          console.log(`✗ ${match.name} - Not found in DB`);
        }
      } catch (error) {
        console.log(`✗ ${match.name} - Error: ${error.message}`);
      }
    }

    console.log(`\n✅ SUMMARY\n`);
    console.log(`Total to add: ${toAdd.length}`);
    console.log(`Successfully added: ${added}`);
    console.log(`Not found in API: ${notFound.length}`);

    if (notFound.length > 0) {
      console.log(`\nNot found in API:`);
      notFound.forEach((m) => console.log(`- ${m}`));
    }

    // Verify
    const stillMissing = await Match.find({ externalId: { $exists: false } });
    console.log(`\nMatches still without externalId: ${stillMissing.length}`);

    if (stillMissing.length === 0) {
      console.log('\n✅ SUCCESS! All matches now have externalId!\n');
      console.log('Next: Restart batch job');
      console.log('  pkill -f "tsx batch-externalid.js"');
      console.log('  nohup npx tsx batch-externalid.js > batch.log 2>&1 &\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => findAndAddNewMatches());
