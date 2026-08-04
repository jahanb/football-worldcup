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

async function showRound16() {
  try {
    // Get all Round of 16 matches
    const round16DB = await Match.find({
      group: 'Round of 16'
    }).sort({ startTime: 1 });

    console.log(`Found ${round16DB.length} Round of 16 matches\n`);
    console.log('━'.repeat(70) + '\n');

    round16DB.forEach((match, index) => {
      const dateStr = new Date(match.startTime).toISOString().split('T')[0];
      const timeStr = new Date(match.startTime).toISOString().split('T')[1].slice(0, 5);

      console.log(`${index + 1}. ${match.homeTeam || 'null'} vs ${match.awayTeam || 'null'}`);
      console.log(`   _id: ${match._id}`);
      console.log(`   city: "${match.city}"`);
      console.log(`   date: ${dateStr} ${timeStr}`);
      console.log(`   externalId: ${match.externalId}`);
      console.log(`   isFinished: ${match.isFinished}\n`);
    });

    console.log('━'.repeat(70) + '\n');
    console.log('Copy this data for updating:\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

connectDatabase().then(() => showRound16());
