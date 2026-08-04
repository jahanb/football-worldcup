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

async function verifyExternalIds() {
  try {
    // Check total matches
    const totalMatches = await Match.countDocuments({});
    console.log(`Total matches in DB: ${totalMatches}`);

    // Check matches with externalId
    const withExternalId = await Match.countDocuments({ externalId: { $exists: true } });
    console.log(`Matches with externalId: ${withExternalId}`);

    // Check matches without externalId
    const withoutExternalId = await Match.countDocuments({ externalId: { $exists: false } });
    console.log(`Matches without externalId: ${withoutExternalId}\n`);

    if (withoutExternalId === 0) {
      console.log('✅ SUCCESS! All matches have externalId!\n');
      return true;
    }

    console.log(`⚠️  ${withoutExternalId} matches still missing externalId:\n`);
    
    const missing = await Match.find({ externalId: { $exists: false } }).limit(20);
    missing.forEach((m) => {
      console.log(`- ${m.homeTeam} vs ${m.awayTeam} (${m.startTime})`);
    });

    if (withoutExternalId > 20) {
      console.log(`... and ${withoutExternalId - 20} more`);
    }

    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  } finally {
    await mongoose.connection.close();
  }
}

async function main() {
  await connectDatabase();
  const success = await verifyExternalIds();
  
  if (success) {
    console.log('Next step: Restart batch job');
    console.log('  pkill -f "tsx batch-externalid.js"');
    console.log('  nohup npx tsx batch-externalid.js > batch.log 2>&1 &');
  } else {
    console.log('\nNext step: Run migration again');
    console.log('  npx tsx populate-missing-externalids.js');
  }
  
  process.exit(success ? 0 : 1);
}

main();
