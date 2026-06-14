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

async function findAndAddExternalIds() {
  try {
    // Get all matches without externalId from DB
    const matchesWithoutId = await Match.find({ externalId: { $exists: false } });

    if (matchesWithoutId.length === 0) {
      console.log('✅ All matches already have externalId!');
      process.exit(0);
    }

    console.log(`Found ${matchesWithoutId.length} matches without externalId\n`);

    // Fetch all matches from API
    console.log('📡 Fetching matches from API...');
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
    console.log(`Fetched ${apiMatches.length} matches from API\n`);

    console.log('🔄 MATCHING AND ADDING externalIds\n');

    let added = 0;
    let notFound = 0;

    for (const dbMatch of matchesWithoutId) {
      // Search for this match in the API
      const apiMatch = apiMatches.find((m) => {
        if (!m.homeTeam?.name || !m.awayTeam?.name) return false;

        const home = m.homeTeam.name.toLowerCase();
        const away = m.awayTeam.name.toLowerCase();
        const dbHome = dbMatch.homeTeam.toLowerCase();
        const dbAway = dbMatch.awayTeam.toLowerCase();

        return (
          (home === dbHome && away === dbAway) ||
          (home === dbAway && away === dbHome)
        );
      });

      if (apiMatch) {
        try {
          // Add the externalId
          await Match.findByIdAndUpdate(
            dbMatch._id,
            { externalId: apiMatch.id },
            { new: true }
          );

          console.log(`✓ ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} → ${apiMatch.id}`);
          added++;
        } catch (error) {
          if (error.code === 11000) {
            console.log(
              `⚠️  ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} - ID ${apiMatch.id} already exists`
            );
          } else {
            console.log(`✗ ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} - Error: ${error.message}`);
          }
        }
      } else {
        console.log(`✗ ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} - NOT FOUND IN API`);
        notFound++;
      }
    }

    console.log(`\n✅ SUMMARY\n`);
    console.log(`Total without externalId: ${matchesWithoutId.length}`);
    console.log(`Successfully added: ${added}`);
    console.log(`Not found in API: ${notFound}\n`);

    // Verify
    const stillMissing = await Match.find({ externalId: { $exists: false } });
    console.log(`Matches still without externalId: ${stillMissing.length}`);

    if (stillMissing.length === 0) {
      console.log('\n✅ SUCCESS! All matches now have externalId!\n');
      console.log('Next step: Restart batch job');
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

connectDatabase().then(() => findAndAddExternalIds());