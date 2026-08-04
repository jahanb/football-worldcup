import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Match from './models/Match.ts';

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

// Check for --test parameter
const isTestMode = process.argv.includes('--test');

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

async function updateLast32Matches() {
  try {
    const modeText = isTestMode ? '🧪 TEST MODE (NO CHANGES)' : '⚡ LIVE MODE (WILL UPDATE)';
    console.log(`${modeText}\n`);

    console.log('📡 Fetching all matches from API...\n');

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

    console.log(`✓ Fetched ${apiMatches.length} total matches from API\n`);

    // Get LAST_32 (knockout) matches from API - only future ones
    const last32API = apiMatches.filter((m) => {
      return m.stage === 'LAST_32' && m.status !== 'FINISHED';
    });

    console.log(`Found ${last32API.length} future LAST_32 matches in API\n`);

    if (last32API.length === 0) {
      console.log('⚠️  No future LAST_32 matches found in API\n');
      process.exit(0);
    }

    // Get LAST_32 matches from DB - look for them by group or placeholder names
    const last32DB = await Match.find({
      $or: [
        { group: 'LAST_32' },
        { group: 'Round of 32' },
        { homeTeam: /^[0-9]/ }, // Placeholder like "2A"
      ]
    });

    console.log(`Found ${last32DB.length} LAST_32 matches in database\n`);

    if (last32DB.length === 0) {
      console.log('ℹ️  Trying to find matches by externalId...\n');

      // Try to match by externalId
      const withExternalId = await Match.find({ 
        externalId: { $in: last32API.map(m => m.id) }
      });

      console.log(`Found ${withExternalId.length} matches with matching externalId\n`);

      if (withExternalId.length === 0) {
        console.log('✗ No LAST_32 matches found in database\n');
        console.log('Please ensure LAST_32 matches are loaded in the database first.\n');
        process.exit(0);
      }
    }

    const dbMatchesToUpdate = last32DB.length > 0 ? last32DB : [];

    console.log('🔄 COMPARING & PREPARING UPDATES...\n');

    const updates = [];
    let unchanged = 0;

    for (const dbMatch of dbMatchesToUpdate) {
      // Find in API by externalId
      let apiMatch = null;

      if (dbMatch.externalId) {
        apiMatch = last32API.find((m) => m.id === dbMatch.externalId);
      }

      if (!apiMatch) {
        console.log(`⏭️  Skip: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} - not found in API\n`);
        continue;
      }

      const apiHome = apiMatch.homeTeam?.name;
      const apiAway = apiMatch.awayTeam?.name;

      if (!apiHome || !apiAway) {
        console.log(
          `⏭️  Skip: externalId ${dbMatch.externalId} - no team names in API\n`
        );
        continue;
      }

      // Check what needs updating
      const needsUpdate = dbMatch.homeTeam !== apiHome || dbMatch.awayTeam !== apiAway;

      if (needsUpdate) {
        updates.push({
          _id: dbMatch._id,
          before: `${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`,
          after: `${apiHome} vs ${apiAway}`,
          homeTeam: apiHome,
          awayTeam: apiAway,
          externalId: dbMatch.externalId,
        });

        console.log(`✓ Will update externalId ${dbMatch.externalId}`);
        console.log(`  Before: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`);
        console.log(`  After:  ${apiHome} vs ${apiAway}\n`);
      } else {
        console.log(`✓ Already correct: ${apiHome} vs ${apiAway}\n`);
        unchanged++;
      }
    }

    console.log('━'.repeat(60) + '\n');
    console.log('📊 SUMMARY\n');
    console.log(`Future LAST_32 matches in API: ${last32API.length}`);
    console.log(`LAST_32 matches in DB: ${dbMatchesToUpdate.length}`);
    console.log(`Will update: ${updates.length}`);
    console.log(`Already correct: ${unchanged}\n`);

    // In test mode, stop here
    if (isTestMode) {
      console.log('🧪 TEST MODE: No changes made\n');
      console.log('To apply these updates, run:\n');
      console.log('  npx tsx update-last32.js\n');
      process.exit(0);
    }

    // Live mode: apply updates
    if (updates.length === 0) {
      console.log('✅ All matches are already correct!\n');
      process.exit(0);
    }

    console.log('⚡ APPLYING UPDATES...\n');

    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
      try {
        const result = await Match.findByIdAndUpdate(
          update._id,
          {
            $set: {
              homeTeam: update.homeTeam,
              awayTeam: update.awayTeam,
            },
          },
          { new: true }
        );

        if (result) {
          console.log(`✓ Updated: ${update.after}`);
          successCount++;
        } else {
          console.log(`✗ Failed to update: ${update.before}`);
          failCount++;
        }
      } catch (error) {
        console.log(`✗ Error updating: ${update.before} - ${error.message}`);
        failCount++;
      }
    }

    console.log('\n✅ FINAL SUMMARY\n');
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Already correct: ${unchanged}\n`);

    if (failCount === 0 && successCount > 0) {
      console.log('🎉 All LAST_32 (knockout) matches updated successfully!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => updateLast32Matches());
