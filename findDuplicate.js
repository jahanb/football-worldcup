import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Match from './models/Match.ts';

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

async function findDuplicateExternalIds() {
  try {
    console.log('\n🔍 FINDING DUPLICATE externalIds\n');

    // Get all matches with externalId
    const matches = await Match.find({ externalId: { $exists: true } });

    if (matches.length === 0) {
      console.log('No matches with externalId found');
      return;
    }

    // Group by externalId
    const externalIdMap = {};
    
    for (const match of matches) {
      const id = match.externalId;
      if (!externalIdMap[id]) {
        externalIdMap[id] = [];
      }
      externalIdMap[id].push({
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: match.startTime,
        _id: match._id,
      });
    }

    // Find duplicates
    const duplicates = Object.entries(externalIdMap).filter(([id, matches]) => matches.length > 1);

    if (duplicates.length === 0) {
      console.log('✓ No duplicate externalIds found');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} externalIds with duplicates:\n`);

    for (const [externalId, matchList] of duplicates) {
      console.log(`externalId: ${externalId}`);
      matchList.forEach((match, idx) => {
        console.log(`  ${idx + 1}. ${match.homeTeam} vs ${match.awayTeam}`);
        console.log(`     Start: ${match.startTime}`);
        console.log(`     ID: ${match._id}\n`);
      });
    }

    console.log('📝 HOW TO FIX:\n');
    console.log('For each duplicate, delete the wrong one:');
    console.log('Example:');
    console.log('  db.matches.deleteOne({ _id: ObjectId("...") })\n');

    console.log('Then run populate-missing-externalids.js again.\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

async function main() {
  await connectDatabase();
  await findDuplicateExternalIds();
}

main();