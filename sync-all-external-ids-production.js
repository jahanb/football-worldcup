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
};

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
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
    logger.info(`✓ Fetched ${data.matches.length} matches from API`);
    return data.matches;
  } catch (error) {
    logger.error('Failed to fetch matches from API:', error);
    return [];
  }
}

async function syncAllExternalIds() {
  try {
    logger.warn('\n⚠️  PRODUCTION SYNC - ALL MATCHES\n');

    // 1. Get API matches
    const apiMatches = await fetchAllMatches();
    if (apiMatches.length === 0) {
      logger.error('No matches found from API');
      return;
    }

    // 2. Get ALL DB matches
    const dbMatches = await Match.find();
    logger.info(`Found ${dbMatches.length} matches in production database\n`);

    // 3. Match and update
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    const updated = [];
    const notFound = [];

    for (const apiMatch of apiMatches) {
      const apiTime = new Date(apiMatch.utcDate).getTime();
      const homeTeam = apiMatch.homeTeam.name;
      const awayTeam = apiMatch.awayTeam.name;
      const externalId = apiMatch.id;

      // Find DB match by startTime (within 1 minute tolerance)
      const dbMatch = dbMatches.find((m) => {
        if (!m.startTime) return false;
        const dbTime = new Date(m.startTime).getTime();
        const timeDiff = Math.abs(apiTime - dbTime);
        return timeDiff < 60000; // Within 1 minute
      });

      if (!dbMatch) {
        notFound.push({
          apiHome: homeTeam,
          apiAway: awayTeam,
          apiTime: apiMatch.utcDate,
          apiId: externalId,
        });
        notFoundCount++;
        continue;
      }

      // Check if already has externalId
      if (dbMatch.externalId) {
        logger.warn(`⏭️  ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} already has ID ${dbMatch.externalId}`);
        skippedCount++;
        continue;
      }

      // Update with external ID
      const result = await Match.findByIdAndUpdate(
        dbMatch._id,
        { externalId },
        { new: true }
      );

      logger.success(
        `${result.homeTeam} vs ${result.awayTeam} (${result.startTime.toISOString()}) → ID: ${externalId}`
      );

      updated.push({
        homeTeam: result.homeTeam,
        awayTeam: result.awayTeam,
        externalId: externalId,
        startTime: result.startTime.toISOString(),
      });

      updatedCount++;
    }

    // Print summary
    console.log('\n' + '='.repeat(120));
    console.log('PRODUCTION SYNC SUMMARY');
    console.log('='.repeat(120));
    console.log(`Total API matches:              ${apiMatches.length}`);
    console.log(`Total DB matches:               ${dbMatches.length}`);
    console.log(`✓ Successfully updated:         ${updatedCount}`);
    console.log(`⏭️  Already had externalId:      ${skippedCount}`);
    console.log(`❌ Not found in DB:             ${notFoundCount}`);
    console.log('='.repeat(120) + '\n');

    // Show updated matches
    if (updated.length > 0) {
      console.log('Updated Matches:');
      console.log('-'.repeat(120));
      updated.forEach((match) => {
        console.log(
          `${match.homeTeam} vs ${match.awayTeam} | ID: ${match.externalId} | Time: ${match.startTime}`
        );
      });
      console.log('-'.repeat(120) + '\n');
    }

    // Show not found matches
    if (notFound.length > 0) {
      console.log('NOT FOUND IN DATABASE (API matches without DB equivalent):');
      console.log('-'.repeat(120));
      notFound.slice(0, 10).forEach((match) => {
        console.log(
          `${match.apiHome} vs ${match.apiAway} | ID: ${match.apiId} | Time: ${match.apiTime}`
        );
      });
      if (notFound.length > 10) {
        console.log(`... and ${notFound.length - 10} more\n`);
      }
      console.log('-'.repeat(120) + '\n');
    }

  } catch (error) {
    logger.error('Error during sync:', error);
  }
}

async function main() {
  logger.warn('\n' + '='.repeat(120));
  logger.warn('PRODUCTION DATABASE SYNC - ALL MATCHES');
  logger.warn('='.repeat(120));
  logger.warn('\nThis script will:');
  logger.warn('1. Fetch ALL matches from football-data.org API');
  logger.warn('2. Match them with ALL matches in your production database');
  logger.warn('3. Update only the externalId field (no other changes)');
  logger.warn('4. Skip matches that already have externalId');
  logger.warn('\nYou have 5 seconds to cancel with Ctrl+C if needed...\n');

  // 5 second delay to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 5000));

  await connectDatabase();
  await syncAllExternalIds();
  await mongoose.connection.close();
  logger.info('✓ Sync complete!');
  process.exit(0);
}

main();