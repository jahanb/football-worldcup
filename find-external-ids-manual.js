import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

import Match from './models/Match.ts';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err || ''),
  success: (msg) => console.log(`[✓ SUCCESS] ${msg}`),
  warn: (msg) => console.warn(`[!] ${msg}`),
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

async function findMissingIds() {
  try {
    logger.info('Analyzing matches without externalId...\n');

    const apiMatches = await fetchAllMatches();
    if (apiMatches.length === 0) {
      logger.error('No matches found from API');
      return;
    }

    // Get all DB matches without externalId
    const dbMatchesWithoutId = await Match.find({ externalId: { $exists: false } });
    logger.info(`Found ${dbMatchesWithoutId.length} DB matches without externalId\n`);

    if (dbMatchesWithoutId.length === 0) {
      logger.success('All matches have externalId!');
      return;
    }

    // For each DB match without ID, find potential API matches
    console.log('='.repeat(100));
    console.log('MATCHING DB MATCHES WITH API MATCHES');
    console.log('='.repeat(100) + '\n');

    const updateCommands = [];
    let exactMatches = 0;
    let noMatchFound = 0;

    for (const dbMatch of dbMatchesWithoutId) {
      const dbTime = new Date(dbMatch.startTime).getTime();
      const dbHome = dbMatch.homeTeam.toLowerCase();
      const dbAway = dbMatch.awayTeam.toLowerCase();

      // Find API matches within 24 hours
      const candidates = apiMatches.filter((apiMatch) => {
        const apiTime = new Date(apiMatch.utcDate).getTime();
        const timeDiff = Math.abs(dbTime - apiTime);
        return timeDiff < 86400000; // Within 24 hours
      });

      if (candidates.length === 0) {
        logger.warn(
          `\n❌ NO CANDIDATES for: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} (${dbMatch.startTime.toISOString()})`
        );
        logger.warn('   This match might not exist in the API');
        noMatchFound++;
        continue;
      }

      // Check for exact time match
      const exactMatch = candidates.find((apiMatch) => {
        const apiTime = new Date(apiMatch.utcDate).getTime();
        const timeDiff = Math.abs(dbTime - apiTime);
        return timeDiff === 0; // Exact same time
      });

      if (exactMatch) {
        logger.success(
          `✓ EXACT MATCH: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`
        );
        logger.success(`  DB Time:  ${dbMatch.startTime.toISOString()}`);
        logger.success(`  API Time: ${exactMatch.utcDate}`);
        logger.success(`  API ID:   ${exactMatch.id}`);
        logger.success(
          `  { matchId: "${dbMatch._id}", externalId: ${exactMatch.id} },`
        );
        updateCommands.push({
          id: dbMatch._id,
          externalId: exactMatch.id,
          type: 'exact',
        });
        exactMatches++;
        console.log();
        continue;
      }

      // Show closest candidates
      logger.warn(
        `\n⚠️  CLOSE MATCHES for: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`
      );
      logger.warn(`   DB Time: ${dbMatch.startTime.toISOString()}`);

      candidates.slice(0, 3).forEach((apiMatch, index) => {
        const apiTime = new Date(apiMatch.utcDate);
        const timeDiff = Math.abs(dbTime - apiTime.getTime());
        const hours = Math.round(timeDiff / 3600000);
        const mins = Math.round((timeDiff % 3600000) / 60000);
        console.log(
          `   ${index + 1}. ${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}`
        );
        console.log(`      API Time: ${apiMatch.utcDate} (${hours}h ${mins}m difference)`);
        console.log(`      API ID:   ${apiMatch.id}`);
        console.log(`      { matchId: "${dbMatch._id}", externalId: ${apiMatch.id} },`);
      });

      if (candidates.length > 3) {
        console.log(
          `   ... and ${candidates.length - 3} more candidates\n`
        );
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total DB matches without ID: ${dbMatchesWithoutId.length}`);
    console.log(`✓ Exact matches found:       ${exactMatches}`);
    console.log(`⚠️  Close matches (manual):    ${dbMatchesWithoutId.length - exactMatches - noMatchFound}`);
    console.log(`❌ No matches found:         ${noMatchFound}`);
    console.log('='.repeat(100) + '\n');

    // Show bulk update format for exact matches
    if (exactMatches > 0) {
      console.log('📋 COPY THIS INTO bulk-update-externalids.js:\n');
      console.log('const updates = [');
      updateCommands
        .filter((cmd) => cmd.type === 'exact')
        .forEach((cmd) => {
          console.log(`  { matchId: "${cmd.id}", externalId: ${cmd.externalId} },`);
        });
      console.log('];');
    }

    console.log(
      '\n💡 For close matches, manually choose the one with smallest time difference.\n'
    );

  } catch (error) {
    logger.error('Error during analysis:', error);
  }
}

async function run() {
  await connectDatabase();
  await findMissingIds();
  await mongoose.connection.close();
  logger.info('Disconnected from MongoDB');
  process.exit(0);
}

run();
