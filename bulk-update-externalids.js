import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
import Match from './models/Match.ts';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err || ''),
  success: (msg) => console.log(`[✓] ${msg}`),
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

/**
 * Bulk update external IDs
 */
async function bulkUpdateExternalIds(updates) {
  try {
    logger.info(`Starting bulk update of ${updates.length} matches...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        const result = await Match.findByIdAndUpdate(
          update.matchId,
          { externalId: update.externalId },
          { new: true }
        );

        if (result) {
          logger.success(
            `${result.homeTeam} vs ${result.awayTeam} → ID: ${update.externalId}`
          );
          successCount++;
        } else {
          logger.error(`Match not found: ${update.matchId}`);
          errorCount++;
        }
      } catch (error) {
        logger.error(`Failed to update ${update.matchId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('BULK UPDATE SUMMARY');
    console.log('='.repeat(80));
    console.log(`✓ Successfully updated: ${successCount}`);
    console.log(`✗ Failed:               ${errorCount}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('Error during bulk update:', error);
  }
}

/**
 * Main function with YOUR DATA
 */
async function main() {
  // YOUR MATCHES
  const updates = [
    { matchId: "6a2470f71d6d6a25aab9255a", externalId: 537331 },
    { matchId: "6a2470f71d6d6a25aab92560", externalId: 537337 },
    { matchId: "6a2470f71d6d6a25aab92566", externalId: 537344 },
    { matchId: "6a2470f71d6d6a25aab9256c", externalId: 537349 },
    { matchId: "6a2470f71d6d6a25aab92572", externalId: 537355 },
    { matchId: "6a2470f71d6d6a25aab92578", externalId: 537361 },
    { matchId: "6a2470f71d6d6a25aab9257e", externalId: 537367 },
    { matchId: "6a2470f71d6d6a25aab92584", externalId: 537373 },
    { matchId: "6a2470f71d6d6a25aab9258a", externalId: 537395 },
    { matchId: "6a2470f71d6d6a25aab92590", externalId: 537401 },
    { matchId: "6a2470f71d6d6a25aab92596", externalId: 537407 },
    { matchId: "6a2470f71d6d6a25aab9259c", externalId: 537413 },
  ];

  if (updates.length === 0) {
    console.log('❌ No updates configured!');
    process.exit(1);
  }

  await connectDatabase();
  await bulkUpdateExternalIds(updates);
  await mongoose.connection.close();
  logger.info('Done!');
  process.exit(0);
}

main();