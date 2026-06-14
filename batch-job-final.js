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

    // Filter matches for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMatches = data.matches.filter((match) => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= today && matchDate < tomorrow;
    });

    return todayMatches;
  } catch (error) {
    logger.error('Failed to fetch matches from API:', error);
    return [];
  }
}

async function updateMatchResults() {
  try {
    logger.info('Starting batch job - checking for finished matches...');

    // Get today's matches from API
    const apiMatches = await getTodayMatches();

    if (apiMatches.length === 0) {
      logger.info('No matches found for today');
      return;
    }

    logger.info(`Found ${apiMatches.length} matches for today`);

    // Get all unfinished matches from DB
    const dbMatches = await Match.find({ isFinished: false });

    if (dbMatches.length === 0) {
      logger.info('No unfinished matches in database');
      return;
    }

    logger.info(`Found ${dbMatches.length} unfinished matches in database`);

    // Process each API match
    for (const apiMatch of apiMatches) {
      const apiTime = new Date(apiMatch.utcDate).getTime();
      const homeTeamName = apiMatch.homeTeam.name;
      const awayTeamName = apiMatch.awayTeam.name;

      // STEP 1: Find corresponding DB match by startTime ONLY (within 1 minute tolerance)
      const dbMatch = dbMatches.find((m) => {
        if (!m.startTime) return false;
        const dbTime = new Date(m.startTime).getTime();
        const timeDiff = Math.abs(apiTime - dbTime);
        return timeDiff < 60000; // Within 1 minute (60000ms)
      });

      if (!dbMatch) {
        logger.warn(
          `Match not found in DB by startTime: ${homeTeamName} vs ${awayTeamName} at ${apiMatch.utcDate}`
        );
        continue;
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
  logger.info('Running every 10 minutes');
  logger.info('Scoring: 1pt (H-Goal) + 1pt (A-Goal) + 1pt (Diff) + 2pts (Result) = Max 5pts');

  // Run immediately on start
  await updateMatchResults();

  // Schedule to run every 10 minutes
  cron.schedule('*/10 * * * *', updateMatchResults);

  logger.info('Cron job scheduled');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

start();