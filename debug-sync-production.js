import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGODB_URI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

import Match from './models/Match.ts';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err || ''),
  success: (msg) => console.log(`[✓] ${msg}`),
  warn: (msg) => console.warn(`[!] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`),
};

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.success('Connected to MongoDB');
    logger.info(`Database: ${mongoose.connection.name}`);
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

    logger.info('Fetching matches from API...');
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
    logger.success(`Fetched ${data.matches.length} matches from API`);
    return data.matches;
  } catch (error) {
    logger.error('Failed to fetch matches from API:', error);
    return [];
  }
}

async function debugSync() {
  try {
    logger.warn('\n' + '='.repeat(120));
    logger.warn('DEBUG MODE - SYNC ANALYSIS');
    logger.warn('='.repeat(120) + '\n');

    // 1. Get API matches
    const apiMatches = await fetchAllMatches();
    if (apiMatches.length === 0) {
      logger.error('No matches found from API');
      return;
    }

    // 2. Get DB matches
    const dbMatches = await Match.find();
    logger.success(`Found ${dbMatches.length} matches in database\n`);

    if (dbMatches.length === 0) {
      logger.warn('⚠️  Database is empty! Nothing to update.');
      return;
    }

    // 3. Show first 3 API matches (detailed)
    console.log('FIRST 3 API MATCHES (Detailed):');
    console.log('-'.repeat(120));
    apiMatches.slice(0, 3).forEach((match) => {
      console.log(`
  Home: ${match.homeTeam.name}
  Away: ${match.awayTeam.name}
  API Time: ${match.utcDate}
  API Time (ms): ${new Date(match.utcDate).getTime()}
  External ID: ${match.id}
  Status: ${match.status}
`);
    });

    // 4. Show first 3 DB matches (detailed)
    console.log('\nFIRST 3 DB MATCHES (Detailed):');
    console.log('-'.repeat(120));
    dbMatches.slice(0, 3).forEach((match) => {
      console.log(`
  Home: ${match.homeTeam}
  Away: ${match.awayTeam}
  DB Time: ${match.startTime.toISOString()}
  DB Time (ms): ${match.startTime.getTime()}
  External ID: ${match.externalId || 'MISSING'}
`);
    });

    // 5. Try to match the first API match with all DB matches
    console.log('\n' + '='.repeat(120));
    console.log('MATCHING ANALYSIS - First API Match vs All DB Matches');
    console.log('='.repeat(120));

    const firstApi = apiMatches[0];
    const apiTime = new Date(firstApi.utcDate).getTime();

    console.log(
      `\nLooking for: ${firstApi.homeTeam.name} vs ${firstApi.awayTeam.name}`
    );
    console.log(`API Time: ${firstApi.utcDate} (${apiTime})\n`);

    const matches = [];
    for (const dbMatch of dbMatches) {
      const dbTime = dbMatch.startTime.getTime();
      const timeDiff = Math.abs(apiTime - dbTime);
      const timeDiffMinutes = Math.round(timeDiff / 60000);
      const isMatch = timeDiff < 60000;

      matches.push({
        homeTeam: dbMatch.homeTeam,
        awayTeam: dbMatch.awayTeam,
        dbTime: dbMatch.startTime.toISOString(),
        timeDiffMs: timeDiff,
        timeDiffMinutes: timeDiffMinutes,
        isMatch: isMatch,
      });
    }

    // Sort by time difference
    matches.sort((a, b) => a.timeDiffMs - b.timeDiffMs);

    // Show closest matches
    console.log('TOP 10 CLOSEST DB MATCHES:');
    console.log('-'.repeat(120));
    matches.slice(0, 10).forEach((match, index) => {
      const matchStatus = match.isMatch ? '✓ WOULD MATCH' : '✗ NO MATCH';
      console.log(
        `${index + 1}. ${match.homeTeam} vs ${match.awayTeam} | Time: ${match.dbTime} | Diff: ${match.timeDiffMinutes} minutes | ${matchStatus}`
      );
    });

    // 6. Summary
    console.log('\n' + '='.repeat(120));
    console.log('SUMMARY');
    console.log('='.repeat(120));
    console.log(`Total API matches: ${apiMatches.length}`);
    console.log(`Total DB matches: ${dbMatches.length}`);

    let matchCount = 0;
    for (const apiMatch of apiMatches) {
      const apiTime = new Date(apiMatch.utcDate).getTime();
      const dbMatch = dbMatches.find((m) => {
        if (!m.startTime) return false;
        const dbTime = new Date(m.startTime).getTime();
        const timeDiff = Math.abs(apiTime - dbTime);
        return timeDiff < 60000;
      });
      if (dbMatch) matchCount++;
    }

    console.log(`\nMatches that WOULD be updated: ${matchCount}`);
    console.log(`Matches that would NOT be found: ${apiMatches.length - matchCount}\n`);

    if (matchCount === 0) {
      console.log('⚠️  NO MATCHES FOUND!');
      console.log('\nPossible reasons:');
      console.log('1. Time differences are too large (> 1 minute)');
      console.log('2. Database times are in different timezone');
      console.log('3. Database is empty or has wrong data\n');

      // Try with larger tolerance
      console.log('Trying with 1 HOUR tolerance:');
      console.log('-'.repeat(120));
      let largeToleranceCount = 0;
      for (const apiMatch of apiMatches) {
        const apiTime = new Date(apiMatch.utcDate).getTime();
        const dbMatch = dbMatches.find((m) => {
          if (!m.startTime) return false;
          const dbTime = new Date(m.startTime).getTime();
          const timeDiff = Math.abs(apiTime - dbTime);
          return timeDiff < 3600000; // 1 hour
        });
        if (dbMatch) largeToleranceCount++;
      }

      console.log(`Matches found with 1 hour tolerance: ${largeToleranceCount}\n`);

      if (largeToleranceCount > 0) {
        console.log('✓ SOLUTION: Times are misaligned by more than 1 minute');
        console.log('   Increase tolerance in the sync script');
      }
    } else {
      console.log(`✓ GOOD NEWS: ${matchCount} matches would be updated!\n`);
    }

  } catch (error) {
    logger.error('Error during debug:', error);
  }
}

async function main() {
  await connectDatabase();
  await debugSync();
  await mongoose.connection.close();
  logger.info('Debug complete!');
  process.exit(0);
}

main();