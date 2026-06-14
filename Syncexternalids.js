import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

import Match from './models/Match.ts';

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  success: (msg) => console.log(`[✓ SUCCESS] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
};

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function fetchAllMatches() {
  try {
    if (!API_KEY) {
      throw new Error('FOOTBALL_DATA_API_KEY environment variable not set');
    }

    logger.info('Fetching all matches from API...');
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
    logger.info(`Fetched ${data.matches.length} matches from API`);
    return data.matches;
  } catch (error) {
    logger.error('Failed to fetch matches from API:', error);
    return [];
  }
}

async function syncExternalIdsByTime() {
  try {
    logger.info('Starting external ID sync by START TIME ONLY...\n');

    // Get all matches from API
    const apiMatches = await fetchAllMatches();
    if (apiMatches.length === 0) {
      logger.error('No matches found from API');
      return;
    }

    // Get all matches from database
    const dbMatches = await Match.find();
    logger.info(`Found ${dbMatches.length} matches in database`);

    // Get matches without external ID
    const dbMatchesWithoutId = dbMatches.filter(m => !m.externalId);
    logger.info(`Found ${dbMatchesWithoutId.length} matches WITHOUT externalId\n`);

    let updatedCount = 0;
    let alreadyHasIdCount = 0;
    const unmatchedByTime = [];

    // Process each API match
    for (const apiMatch of apiMatches) {
      const apiTime = new Date(apiMatch.utcDate).getTime();
      const apiHomeTeam = apiMatch.homeTeam.name;
      const apiAwayTeam = apiMatch.awayTeam.name;
      const externalId = apiMatch.id;

      // STEP 1: Find DB match ONLY by startTime (within 1 minute tolerance)
      const dbMatch = dbMatches.find((m) => {
        if (!m.startTime) return false;
        const dbTime = new Date(m.startTime).getTime();
        const timeDiff = Math.abs(apiTime - dbTime);
        return timeDiff < 60000; // Within 1 minute (60000ms)
      });

      if (!dbMatch) {
        // No match found by time
        unmatchedByTime.push({
          apiHome: apiHomeTeam,
          apiAway: apiAwayTeam,
          apiTime: apiMatch.utcDate,
          apiId: externalId,
        });
        continue;
      }

      // STEP 2: Check if already has externalId
      if (dbMatch.externalId) {
        logger.warn(
          `${dbMatch.homeTeam} vs ${dbMatch.awayTeam} (${dbMatch.startTime.toISOString()}) already has externalId: ${dbMatch.externalId}`
        );
        alreadyHasIdCount++;
        continue;
      }

      // STEP 3: Update with external ID
      await Match.findByIdAndUpdate(
        dbMatch._id,
        { externalId },
        { new: true }
      );

      logger.success(
        `${dbMatch.homeTeam} vs ${dbMatch.awayTeam} (${dbMatch.startTime.toISOString()}) → externalId: ${externalId}`
      );
      updatedCount++;
    }

    // Print summary
    console.log('\n' + '='.repeat(100));
    console.log('SYNC SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total matches in API:              ${apiMatches.length}`);
    console.log(`Total matches in DB:               ${dbMatches.length}`);
    console.log(`Matches in DB without externalId:  ${dbMatchesWithoutId.length}`);
    console.log(`✓ Successfully updated:            ${updatedCount}`);
    console.log(`⚠ Already had externalId:         ${alreadyHasIdCount}`);
    console.log(`✗ Not found by startTime:          ${unmatchedByTime.length}`);
    console.log('='.repeat(100) + '\n');

    // Show unmatched matches
    if (unmatchedByTime.length > 0) {
      console.log('UNMATCHED API MATCHES (not found in DB by startTime):\n');
      unmatchedByTime.forEach((match, index) => {
        console.log(`${index + 1}. ${match.apiHome} vs ${match.apiAway}`);
        console.log(`   API Time:  ${match.apiTime}`);
        console.log(`   API ID:    ${match.apiId}`);
        console.log();
      });

      console.log('='.repeat(100));
      console.log('SOLUTIONS:');
      console.log('='.repeat(100));
      console.log('\nReason: These matches exist in API but NOT in your DB (or have different times)\n');

      console.log('Option 1: Check if the match exists in your DB with different time');
      unmatchedByTime.slice(0, 3).forEach((match) => {
        console.log(`  db.matches.findOne({ homeTeam: /${match.apiHome}/, awayTeam: /${match.apiAway}/ })`);
      });

      console.log('\n\nOption 2: Insert the missing matches from API');
      console.log('  Run: npm run insert:matches\n');

      console.log('Option 3: Manually add externalId if match exists with different name');
      unmatchedByTime.slice(0, 3).forEach((match) => {
        console.log(`\n  db.matches.updateOne(`);
        console.log(`    { startTime: new Date("${match.apiTime}") },`);
        console.log(`    { $set: { externalId: ${match.apiId} } }`);
        console.log(`  );`);
      });

      console.log('\n' + '='.repeat(100) + '\n');
    } else {
      console.log('✅ All API matches found in DB and synced!\n');
    }

  } catch (error) {
    logger.error('Error during sync:', error);
  }
}

async function run() {
  await connectDatabase();
  await syncExternalIdsByTime();
  await mongoose.connection.close();
  logger.info('Disconnected from MongoDB');
  process.exit(0);
}

run();