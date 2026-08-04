import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Match from './models/Match.ts';

const MONGODB_URI = process.env.MONGODB_URI;

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

async function updateLastQuarterfinalDirect() {
  try {
    const modeText = isTestMode ? '🧪 TEST MODE (NO CHANGES)' : '⚡ LIVE MODE (WILL UPDATE)';
    console.log(`${modeText}\n`);

    console.log('🏆 UPDATING LAST QUARTER-FINAL MATCH\n');
    console.log('━'.repeat(70) + '\n');

    // Find the last match by externalId 537386
    const lastMatch = await Match.findOne({
      externalId: 537386,
      group: 'Quarter-final'
    });

    if (!lastMatch) {
      console.log('✗ Match not found in database\n');
      console.log('Looking for:');
      console.log('  externalId: 537386');
      console.log('  group: Quarter-final\n');
      process.exit(0);
    }

    console.log(`Match: ${lastMatch.city}`);
    console.log(`  Current: "${lastMatch.homeTeam}" vs "${lastMatch.awayTeam}"`);
    console.log(`  📅 ${new Date(lastMatch.startTime).toISOString().split('T')[0]}`);
    console.log(`  🆔 externalId: ${lastMatch.externalId}\n`);

    const needsUpdate = lastMatch.homeTeam !== 'Argentina' || lastMatch.awayTeam !== 'Switzerland';

    if (!needsUpdate) {
      console.log('✓ Already correct: Argentina vs Switzerland\n');
      process.exit(0);
    }

    console.log('📋 WILL UPDATE TO:\n');
    console.log('  Argentina vs Switzerland\n');

    console.log('━'.repeat(70) + '\n');

    // Test mode
    if (isTestMode) {
      console.log('🧪 TEST MODE: No changes made\n');
      console.log('To apply update, run:\n');
      console.log('  node update-last-quarterfinal-direct.js\n');
      process.exit(0);
    }

    // Live mode: update
    console.log('⚡ APPLYING UPDATE...\n');

    try {
      const result = await Match.findByIdAndUpdate(
        lastMatch._id,
        {
          $set: {
            homeTeam: 'Argentina',
            awayTeam: 'Switzerland',
          },
        },
        { new: true }
      );

      if (result) {
        console.log(`✓ Updated: Argentina vs Switzerland`);
        console.log(`  _id: ${result._id}`);
        console.log(`  📍 ${result.city}`);
        console.log(`  📅 ${new Date(result.startTime).toISOString().split('T')[0]}\n`);

        console.log('━'.repeat(70) + '\n');
        console.log('✅ FINAL SUMMARY\n');
        console.log('Successfully updated: 1\n');
        console.log('🎉 LAST QUARTER-FINAL MATCH UPDATED!\n');
        console.log('All 4 Quarter-final matches:');
        console.log('  1. France vs Morocco');
        console.log('  2. Spain vs Belgium');
        console.log('  3. Norway vs England');
        console.log('  4. Argentina vs Switzerland\n');
      } else {
        console.log('✗ Failed to update\n');
      }
    } catch (error) {
      console.log('✗ Error updating:');
      console.log(`  ${error.message}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => updateLastQuarterfinalDirect());
