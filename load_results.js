require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
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

// Fetch all matches from MongoDB
async function fetchMatches() {
    try {
        const matches = await collection.find({}).toArray();
        console.log(`📋 Found ${matches.length} matches in database\n`);
        return matches;
    } catch (err) {
        console.error('Error fetching matches:', err);
        process.exit(1);
    }
}

// Make request to Gemini API
async function callGeminiAPI(prompt) {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            }
        );

        const data = await response.json();

        // Check for API errors
        if (data.error) {
            console.error('   🔴 API Error:', data.error.message);
            throw new Error(data.error.message);
        }

        return data;
    } catch (err) {
        console.error('   🔴 Request Error:', err.message);
        throw err;
    }
}

// Select first country from list (if separated by -)
function getFirstCountry(teamName) {
    if (teamName.includes('-')) {
        return teamName.split('-')[0].trim();
    }
    return teamName;
}

// Predict match result
async function predictMatch(match) {
    const homeTeam = getFirstCountry(match.homeTeam);
    const awayTeam = getFirstCountry(match.awayTeam);

    const prompt = `Predict the score for this 2026 FIFA World Cup match:
${homeTeam} vs ${awayTeam}
Group: ${match.group}
Date: ${new Date(match.startTime).toLocaleDateString()}

Please provide a realistic score prediction in the format "X-Y" (e.g., "2-1").
Consider team strength, historical performance, and typical World Cup match outcomes.
Respond with ONLY the score in format "X-Y", nothing else.`;

    try {
        const response = await callGeminiAPI(prompt);

        if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
            const prediction = response.candidates[0].content.parts[0].text.trim();
            return prediction;
        }
        return null;
    } catch (err) {
        console.error(`   ⚠️  Error predicting ${homeTeam} vs ${awayTeam}:`, err.message);
        return null;
    }
}

// Parse score prediction
function parseScore(prediction) {
    if (!prediction) return null;

    // Extract X-Y format
    const match = prediction.match(/(\d+)\s*[-–—]\s*(\d+)/);
    if (match) {
        return {
            home: parseInt(match[1]),
            away: parseInt(match[2])
        };
    }
    return null;
}

// Update match in MongoDB
async function updateMatchResult(matchId, resultHome, resultAway) {
    try {
        const result = await collection.updateOne(
            { _id: matchId },
            {
                $set: {
                    resultHome: resultHome,
                    resultAway: resultAway,
                    isFinished: true
                }
            }
        );
        return result.modifiedCount > 0;
    } catch (err) {
        console.error(`   ❌ Error updating match ${matchId}:`, err.message);
        return false;
    }
}

// Add delay between requests
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
    console.log('🔮 Starting World Cup 2026 Match Predictions with Gemini AI...\n');

    // Check if API key is set
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in environment variables!');
        console.error('   Please create a .env file with: GEMINI_API_KEY=your_key_here');
        process.exit(1);
    }

    console.log('🔑 API Key loaded:', GEMINI_API_KEY.substring(0, 10) + '...\n');

    await connectToMongoDB();

    const matches = await fetchMatches();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const matchDate = new Date(match.startTime).toLocaleDateString();
        const homeTeam = getFirstCountry(match.homeTeam);
        const awayTeam = getFirstCountry(match.awayTeam);

        console.log(`[${i + 1}/${matches.length}] ${homeTeam} vs ${awayTeam} (Group ${match.group})`);

        // Get prediction from Gemini
        const prediction = await predictMatch(match);
        console.log(`   📝 Raw prediction: "${prediction}"`);

        if (prediction) {
            const score = parseScore(prediction);

            if (score) {
                // Update MongoDB
                const updated = await updateMatchResult(match._id, score.home, score.away);

                if (updated) {
                    console.log(`   ✅ Prediction: ${score.home}-${score.away} (${homeTeam} vs ${awayTeam}) → Updated in DB`);
                    successCount++;
                } else {
                    console.log(`   ⚠️  Prediction: ${score.home}-${score.away} → Failed to update DB`);
                    failCount++;
                }
            } else {
                console.log(`   ⚠️  Could not parse prediction: ${prediction}`);
                failCount++;
            }
        } else {
            console.log(`   ❌ Failed to get prediction for ${homeTeam} vs ${awayTeam}`);
            failCount++;
        }

        console.log('');

        // Delay to avoid rate limiting
        if (i < matches.length - 1) {
            await delay(1000); // 1 second delay between requests
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('PREDICTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully predicted and updated: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total matches: ${matches.length}`);
    console.log('='.repeat(60));

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