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

async function updateSemiFinal() {
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

    // Get all Semi-final matches from DB
    const semiFinals = await Match.find({
      group: 'Semi-final'
    }).sort({ startTime: 1 });

    console.log(`Found ${semiFinals.length} Semi-final matches in database\n`);
    console.log('🏆 SEMI-FINAL MATCHES:\n');
    console.log('━'.repeat(70) + '\n');

    const updates = [];
    let unchanged = 0;

    for (const dbMatch of semiFinals) {
      const dateStr = new Date(dbMatch.startTime).toISOString().split('T')[0];
      const timeStr = new Date(dbMatch.startTime).toISOString().split('T')[1].slice(0, 5);

      console.log(`Match: ${dbMatch.city}`);
      console.log(`  Current: "${dbMatch.homeTeam}" vs "${dbMatch.awayTeam}"`);
      console.log(`  📅 ${dateStr} ${timeStr}`);
      console.log(`  🆔 externalId: ${dbMatch.externalId}`);

      if (!dbMatch.externalId) {
        console.log(`  ⚠️  No externalId - cannot update\n`);
        continue;
      }

      // Find in API by externalId
      const apiMatch = apiMatches.find((m) => m.id === dbMatch.externalId);

      if (!apiMatch) {
        console.log(`  ✗ Not found in API\n`);
        continue;
      }

      const apiHome = apiMatch.homeTeam?.name;
      const apiAway = apiMatch.awayTeam?.name;

      console.log(`  API: ${apiHome || 'NULL'} vs ${apiAway || 'NULL'}`);

      if (!apiHome || !apiAway) {
        console.log(`  ⚠️  API has no team names yet\n`);
        continue;
      }

      // Check if needs update
      const needsUpdate = dbMatch.homeTeam !== apiHome || dbMatch.awayTeam !== apiAway;

      if (needsUpdate) {
        console.log(`  ✓ Will update to: ${apiHome} vs ${apiAway}\n`);
        updates.push({
          _id: dbMatch._id,
          city: dbMatch.city,
          externalId: dbMatch.externalId,
          before: `${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`,
          after: `${apiHome} vs ${apiAway}`,
          homeTeam: apiHome,
          awayTeam: apiAway,
        });
      } else {
        console.log(`  ✓ Already correct: ${apiHome} vs ${apiAway}\n`);
        unchanged++;
      }
    }

    console.log('━'.repeat(70) + '\n');
    console.log('📊 SUMMARY\n');
    console.log(`Total Semi-final matches: ${semiFinals.length}`);
    console.log(`Will update: ${updates.length}`);
    console.log(`Already correct: ${unchanged}\n`);

    // Test mode
    if (isTestMode) {
      console.log('🧪 TEST MODE: No changes made\n');
      console.log('To apply updates, run:\n');
      console.log('  node update-semifinal.js\n');
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
          console.log(`✓ Updated (${update.city}): ${update.after}`);
          console.log(`  🆔 externalId: ${update.externalId}`);
          successCount++;
        } else {
          console.log(`✗ Failed to update: ${update.before}`);
          failCount++;
        }
      } catch (error) {
        console.log(`✗ Error updating: ${update.before}`);
        console.log(`  ${error.message}`);
        failCount++;
      }
    }

    console.log('\n✅ FINAL SUMMARY\n');
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Already correct: ${unchanged}\n`);

    if (failCount === 0 && successCount > 0) {
      console.log('🎉 ALL SEMI-FINAL MATCHES UPDATED!\n');
      console.log('Your Semi-final matchups:');
      console.log('  1. France vs Spain');
      console.log('  2. England vs Argentina\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => updateSemiFinal());
