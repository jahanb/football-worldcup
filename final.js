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

async function updateThirdPlaceAndFinalDirect() {
  try {
    const modeText = isTestMode ? '🧪 TEST MODE (NO CHANGES)' : '⚡ LIVE MODE (WILL UPDATE)';
    console.log(`${modeText}\n`);

    console.log('🏆 UPDATING 3RD PLACE MATCH AND FINAL\n');
    console.log('━'.repeat(70) + '\n');

    // Matches to update
    const matchesToUpdate = [
      {
        externalId: 537389,
        group: 'Match for third place',
        newHome: 'England',
        newAway: 'France',
        display: '3rd Place Match: England vs France (Miami)'
      },
      {
        externalId: 537390,
        group: 'Final',
        newHome: 'Spain',
        newAway: 'Argentina',
        display: 'Final: Spain vs Argentina (New York)'
      }
    ];

    console.log('Matches to update:\n');
    matchesToUpdate.forEach((m) => {
      console.log(`  ${m.display}`);
    });

    console.log('\n' + '━'.repeat(70) + '\n');

    // Find matches in database
    console.log('🔍 FINDING MATCHES IN DATABASE:\n');

    const updates = [];

    for (const match of matchesToUpdate) {
      const dbMatch = await Match.findOne({
        externalId: match.externalId,
        group: match.group
      });

      if (!dbMatch) {
        console.log(`✗ ${match.display} - NOT FOUND\n`);
        continue;
      }

      console.log(`✓ Found: ${dbMatch.city}`);
      console.log(`  Current: "${dbMatch.homeTeam}" vs "${dbMatch.awayTeam}"`);
      console.log(`  Will update to: ${match.newHome} vs ${match.newAway}\n`);

      updates.push({
        _id: dbMatch._id,
        city: dbMatch.city,
        group: match.group,
        before: `${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`,
        after: `${match.newHome} vs ${match.newAway}`,
        newHome: match.newHome,
        newAway: match.newAway
      });
    }

    console.log('━'.repeat(70) + '\n');
    console.log('📊 SUMMARY\n');
    console.log(`Found in DB: ${updates.length}`);
    console.log(`Ready to update: ${updates.length}\n`);

    // Test mode
    if (isTestMode) {
      console.log('🧪 TEST MODE: No changes made\n');
      console.log('To apply updates, run:\n');
      console.log('  node update-third-place-and-final-direct.js\n');
      process.exit(0);
    }

    // Live mode: apply updates
    if (updates.length === 0) {
      console.log('✅ No matches to update!\n');
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
              homeTeam: update.newHome,
              awayTeam: update.newAway,
            },
          },
          { new: true }
        );

        if (result) {
          console.log(`✓ Updated (${update.group}): ${update.after}`);
          console.log(`  📍 ${update.city}\n`);
          successCount++;
        } else {
          console.log(`✗ Failed to update: ${update.before}\n`);
          failCount++;
        }
      } catch (error) {
        console.log(`✗ Error updating: ${update.before}`);
        console.log(`  ${error.message}\n`);
        failCount++;
      }
    }

    console.log('━'.repeat(70) + '\n');
    console.log('✅ FINAL SUMMARY\n');
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}\n`);

    if (failCount === 0 && successCount > 0) {
      console.log('🎉 3RD PLACE MATCH AND FINAL UPDATED!\n');
      console.log('Your final matches:');
      console.log('  3rd Place: England vs France (Miami)');
      console.log('  Final: Spain vs Argentina (New York)\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => updateThirdPlaceAndFinalDirect());
