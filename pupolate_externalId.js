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
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

async function populateMissingExternalIds() {
  try {
    console.log('\n🔍 FINDING MATCHES WITHOUT externalId\n');

    // Get all matches without externalId
    const matchesWithoutId = await Match.find({ externalId: { $exists: false } });

    if (matchesWithoutId.length === 0) {
      console.log('✓ All matches have externalId!');
      return;
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
    console.log('🔄 MATCHING AND UPDATING\n');

    let updated = 0;
    let notFound = 0;

    for (const dbMatch of matchesWithoutId) {
      // Try to find in API by team names and time
      let foundMatch = null;

      // Method 1: Exact match by team names and time (within 5 minutes)
      const dbTime = new Date(dbMatch.startTime).getTime();
      foundMatch = apiMatches.find((apiMatch) => {
        const apiTime = new Date(apiMatch.utcDate).getTime();
        const timeDiff = Math.abs(apiTime - dbTime);

        const homeMatch =
          apiMatch.homeTeam.name.toLowerCase() === dbMatch.homeTeam.toLowerCase() &&
          apiMatch.awayTeam.name.toLowerCase() === dbMatch.awayTeam.toLowerCase();

        const awayMatch =
          apiMatch.homeTeam.name.toLowerCase() === dbMatch.awayTeam.toLowerCase() &&
          apiMatch.awayTeam.name.toLowerCase() === dbMatch.homeTeam.toLowerCase();

        return (homeMatch || awayMatch) && timeDiff < 5 * 60 * 1000; // Within 5 minutes
      });

      if (foundMatch) {
        // Update the database
        await Match.findByIdAndUpdate(
          dbMatch._id,
          { externalId: foundMatch.id },
          { new: true }
        );

        console.log(
          `✓ ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} → externalId: ${foundMatch.id}`
        );
        updated++;
      } else {
        console.log(
          `✗ ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} (${dbMatch.startTime}) - NOT FOUND IN API`
        );
        notFound++;
      }
    }

    console.log(`\n✅ SUMMARY\n`);
    console.log(`Total matches without externalId: ${matchesWithoutId.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Not found in API: ${notFound}`);

    if (notFound > 0) {
      console.log(`\n⚠️  ${notFound} matches could not be matched.`);
      console.log('These might not exist in the API yet.\n');
    }

    // Verify
    console.log('🔍 VERIFICATION\n');
    const stillMissing = await Match.find({ externalId: { $exists: false } });
    console.log(`Matches still without externalId: ${stillMissing.length}`);

    if (stillMissing.length > 0) {
      console.log('\nMatches still missing externalId:');
      stillMissing.forEach((m) => {
        console.log(`- ${m.homeTeam} vs ${m.awayTeam} (${m.startTime})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

async function main() {
  await connectDatabase();
  await populateMissingExternalIds();
}

main();