import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Match from './models/Match.ts';

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

// The 6 matches that still need externalIds
// with their IDs from the API
const matchesToAdd = [
  { homeTeam: 'South Africa', awayTeam: 'South Korea', externalId: 537332 },
  { homeTeam: 'Paraguay', awayTeam: 'Australia', externalId: 537350 },
  { homeTeam: 'Senegal', awayTeam: 'Iraq', externalId: 537396 },
  { homeTeam: 'Croatia', awayTeam: 'Ghana', externalId: 537414 },
  // The 2 not found in API - can be added manually if you find them
  // { homeTeam: 'Bosnia & Herzegovina', awayTeam: 'Qatar', externalId: ??? },
  // { homeTeam: 'DR Congo', awayTeam: 'Uzbekistan', externalId: ??? },
];

async function addExternalIds() {
  try {
    console.log(`Adding externalIds for ${matchesToAdd.length} matches...\n`);

    for (const match of matchesToAdd) {
      try {
        // First, remove this ID from any other match (clean up duplicates)
        await Match.updateMany(
          { externalId: match.externalId, _id: { $ne: new mongoose.Types.ObjectId() } },
          { $unset: { externalId: "" } }
        );

        // Now add it to the correct match
        const result = await Match.findOneAndUpdate(
          { 
            homeTeam: match.homeTeam, 
            awayTeam: match.awayTeam 
          },
          { $set: { externalId: match.externalId } },
          { new: true }
        );

        if (result) {
          console.log(`✓ ${match.homeTeam} vs ${match.awayTeam} → ${match.externalId}`);
        } else {
          console.log(`✗ ${match.homeTeam} vs ${match.awayTeam} - Match not found in DB`);
        }
      } catch (error) {
        console.log(`✗ ${match.homeTeam} vs ${match.awayTeam} - Error: ${error.message}`);
      }
    }

    console.log('\n✅ Done!\n');

    // Verify
    const stillMissing = await Match.find({ externalId: { $exists: false } });
    console.log(`Matches still without externalId: ${stillMissing.length}`);

    if (stillMissing.length > 0) {
      console.log('\nRemaining matches without externalId:');
      stillMissing.forEach((m) => {
        console.log(`- ${m.homeTeam} vs ${m.awayTeam}`);
      });
      console.log('\nThese might not be in the API yet. Check with:');
      console.log('  npx tsx find-matches-in-api.js\n');
    }

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

connectDatabase().then(() => addExternalIds());
