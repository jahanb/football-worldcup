import cron from 'node-cron';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import Match from './models/Match.ts';
import Prediction from './models/Prediction.ts';
import User from './models/User.ts';

// Import scoring module
import {
  calculatePoints,
  calculatePointDifference,
  formatScoreLog,
} from './lib/scoring.ts';

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const COMPETITION_CODE = process.env.COMPETITION_CODE || 'WC';

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  success: (msg) => console.log(`[✓] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
};

async function connectDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info('Already connected to MongoDB');
      return;
    }

    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function getTodayMatches() {
  try {
    if (!API_KEY) {
      throw new Error('FOOTBALL_DATA_API_KEY environment variable not set');
    }

    // Get today's date range (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get unfinished matches from database
    const dbUnfinished = await Match.find({ isFinished: false });

    if (dbUnfinished.length === 0) {
      logger.info('No unfinished matches in database');
      return [];
    }

    // Fetch all matches from API
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

    // Find today's matches (unfinished in DB, started today or yesterday, finished in API)
    const todayMatches = [];
    const todayStarting = [];

    for (const dbMatch of dbUnfinished) {
      if (!dbMatch.externalId) continue;
      
      const apiMatch = data.matches.find(m => m.id === dbMatch.externalId);
      if (!apiMatch) continue;

      const matchStartDate = new Date(apiMatch.utcDate);
      matchStartDate.setHours(0, 0, 0, 0);
      
      // Check if match started today or yesterday (for cross-day matches)
      const isDayInRange = (matchStartDate >= new Date(today.getTime() - 24*60*60*1000)) && 
                          (matchStartDate <= today);

      if (isDayInRange) {
        // If it started today/yesterday, include it
        if (apiMatch.status === 'FINISHED') {
          todayMatches.push(apiMatch); // Will be processed
        } else if (matchStartDate.getTime() === today.getTime()) {
          todayStarting.push(apiMatch); // Starting today
        }
      }
    }

    // Log starting matches for visibility
    if (todayStarting.length > 0) {
      logger.info(`Today's matches: ${todayStarting.map(m => `${m.homeTeam.name} vs ${m.awayTeam.name}`).join(', ')}`);
    }

    // Log finished matches
    if (todayMatches.length > 0) {
      logger.info(`Found ${todayMatches.length} finished matches to process`);
    }
    
    return todayMatches;
  } catch (error) {
    logger.error('Failed to fetch matches from API:', error);
    return [];
  }
}

async function updateMatchResults() {
  try {
    logger.info('Starting batch job - checking for finished matches...');

    // Get today's matches (matches that started today/yesterday, finished in API)
    const apiMatches = await getTodayMatches();

    if (apiMatches.length === 0) {
      logger.info('No finished matches to process today');
      return;
    }

    // Get all DB matches for externalId matching
    const dbMatches = await Match.find({});

    // Process each API match
    for (const apiMatch of apiMatches) {
      const apiExternalId = apiMatch.id;
      const homeTeamName = apiMatch.homeTeam.name;
      const awayTeamName = apiMatch.awayTeam.name;

      // STEP 1: Find corresponding DB match by externalId (primary method)
      let dbMatch = dbMatches.find((m) => m.externalId === apiExternalId);
      let matchMethod = 'externalId';

      // STEP 1B: Fallback to startTime matching if externalId not found (for legacy records)
      if (!dbMatch) {
        const apiTime = new Date(apiMatch.utcDate).getTime();
        dbMatch = dbMatches.find((m) => {
          if (!m.startTime) return false;
          const dbTime = new Date(m.startTime).getTime();
          const timeDiff = Math.abs(apiTime - dbTime);
          return timeDiff < 60000; // Within 1 minute (60000ms)
        });
        if (dbMatch) matchMethod = 'startTime (fallback)';
      }

      if (!dbMatch) {
        logger.warn(
          `Match not found in DB: ${homeTeamName} vs ${awayTeamName} (API ID: ${apiExternalId}, Time: ${apiMatch.utcDate})`
        );
        continue;
      }

      logger.info(
        `Match found using ${matchMethod}: ${homeTeamName} vs ${awayTeamName}`
      );

      // STEP 1C: Update externalId if missing (populate legacy records)
      if (!dbMatch.externalId && apiExternalId) {
        await Match.findByIdAndUpdate(
          dbMatch._id,
          { externalId: apiExternalId },
          { new: true }
        );
        logger.info(
          `Updated externalId for match ${dbMatch._id}: ${apiExternalId}`
        );
        dbMatch.externalId = apiExternalId; // Update in-memory object
      }

      // STEP 2: Check if match is finished
      if (apiMatch.status === 'FINISHED' && !dbMatch.isFinished) {
        logger.info(
          `Match found finished: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam}`
        );

        const resultHome = apiMatch.score.fullTime.home;
        const resultAway = apiMatch.score.fullTime.away;

        // STEP 3: Update match with results
        await Match.findByIdAndUpdate(
          dbMatch._id,
          {
            isFinished: true,
            resultHome,
            resultAway,
          },
          { new: true }
        );

        logger.info(
          `Match updated: ${dbMatch.homeTeam} ${resultHome} - ${resultAway} ${dbMatch.awayTeam}`
        );

        // STEP 4: Get all predictions for this match
        const predictions = await Prediction.find({
          matchId: new mongoose.Types.ObjectId(dbMatch._id),
        });

        logger.info(`Found ${predictions.length} predictions for this match`);

        // STEP 5: Update user scores based on predictions
        for (const prediction of predictions) {
          // Calculate points using the production-ready scoring function
          const result = calculatePoints(
            prediction.predHome,
            prediction.predAway,
            resultHome,
            resultAway
          );

          // Handle atomic point difference (in case score was updated multiple times)
          const oldPoints = Number(prediction.points) || 0;
          const pointDiff = calculatePointDifference(result.points, oldPoints);

          // Update prediction with new points
          await Prediction.findByIdAndUpdate(
            prediction._id,
            { points: result.points },
            { new: true }
          );

          // Update user's total score (only if points changed)
          if (pointDiff !== 0) {
            await User.findByIdAndUpdate(
              prediction.userId,
              { $inc: { totalPoints: pointDiff } },
              { new: true }
            );
          }

          // Log with detailed breakdown
          const scoreLog = formatScoreLog(
            `${prediction.predHome}-${prediction.predAway}`,
            `${resultHome}-${resultAway}`,
            result
          );

          logger.success(
            `User ${prediction.userId}: ${scoreLog} | Diff: +${pointDiff}`
          );
        }
      } else if (apiMatch.status === 'FINISHED' && dbMatch.isFinished) {
        logger.info(
          `Match already updated: ${dbMatch.homeTeam} vs ${dbMatch.awayTeam} (skipping)`
        );
      }
    }

    logger.info('Batch job completed successfully');
  } catch (error) {
    logger.error('Error during batch job execution:', error);
  }
}

async function start() {
  await connectDatabase();

  logger.info('Batch job scheduler started');
  logger.info('Running every 5 minutes');
  logger.info('Scoring: 1pt (H-Goal) + 1pt (A-Goal) + 1pt (Diff) + 2pts (Result) = Max 5pts');

  // Run immediately on start
  await updateMatchResults();

  // Schedule to run every 5 minutes
  cron.schedule('*/5 * * * *', updateMatchResults);

  logger.info('Cron job scheduled');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

start();