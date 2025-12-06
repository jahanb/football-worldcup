require('dotenv').config();
const { MongoClient } = require('mongodb');

// Configuration
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'test';
const COLLECTION_NAME = 'matches';

// MongoDB client
let client;
let db;
let collection;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  }
}

// Reset all predictions
async function resetPredictions() {
  try {
    console.log('\n🔄 Resetting all match predictions...\n');

    // First, let's see how many matches have predictions
    const beforeCount = await collection.countDocuments({
      $or: [
        { resultHome: { $ne: null } },
        { resultAway: { $ne: null } },
        { isFinished: true }
      ]
    });

    console.log(`📊 Found ${beforeCount} matches with predictions\n`);

    const result = await collection.updateMany(
      {}, // Update all documents
      {
        $set: {
          resultHome: null,
          resultAway: null,
          isFinished: false
        }
      }
    );

    console.log(`✅ MongoDB response:`);
    console.log(`   - Matched: ${result.matchedCount} documents`);
    console.log(`   - Modified: ${result.modifiedCount} documents`);
    console.log(`   - Acknowledged: ${result.acknowledged}\n`);

    return result.modifiedCount;
  } catch (err) {
    console.error('❌ Error resetting predictions:', err);
    console.error('Full error:', err);
    throw err;
  }
}

// Verify reset
async function verifyReset() {
  try {
    const withPredictions = await collection.countDocuments({
      $or: [
        { resultHome: { $ne: null } },
        { resultAway: { $ne: null } },
        { isFinished: true }
      ]
    });

    const totalMatches = await collection.countDocuments({});

    console.log('📊 Verification:');
    console.log(`   - Total matches: ${totalMatches}`);
    console.log(`   - Matches with predictions: ${withPredictions}`);
    console.log(`   - Matches reset: ${totalMatches - withPredictions}\n`);

    if (withPredictions === 0) {
      console.log('✅ All predictions successfully reset!');
    } else {
      console.log('⚠️  Warning: Some matches still have predictions');
    }
  } catch (err) {
    console.error('❌ Error verifying reset:', err);
  }
}

// Main function
async function main() {
  console.log('🗑️  Match Predictions Reset Tool\n');
  console.log('Database:', `${MONGO_URL}/${DB_NAME}/${COLLECTION_NAME}`);
  console.log('='.repeat(60));

  await connectToMongoDB();

  // Show a sample match before reset
  console.log('\n📄 Sample match BEFORE reset:');
  const sampleBefore = await collection.findOne({});
  console.log(JSON.stringify({
    homeTeam: sampleBefore?.homeTeam,
    awayTeam: sampleBefore?.awayTeam,
    resultHome: sampleBefore?.resultHome,
    resultAway: sampleBefore?.resultAway,
    isFinished: sampleBefore?.isFinished
  }, null, 2));

  // Reset predictions
  await resetPredictions();

  // Show the same match after reset
  console.log('\n📄 Sample match AFTER reset:');
  const sampleAfter = await collection.findOne({ _id: sampleBefore._id });
  console.log(JSON.stringify({
    homeTeam: sampleAfter?.homeTeam,
    awayTeam: sampleAfter?.awayTeam,
    resultHome: sampleAfter?.resultHome,
    resultAway: sampleAfter?.resultAway,
    isFinished: sampleAfter?.isFinished
  }, null, 2));

  // Verify the reset
  await verifyReset();

  // Close MongoDB connection
  await client.close();
  console.log('\n✅ MongoDB connection closed');
  console.log('🎉 Process completed!');
}

// Run the script
main().catch(err => {
  console.error('Fatal error:', err);
  if (client) {
    client.close();
  }
  process.exit(1);
});