import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Use a flexible schema to handle the cleanup
const matchSchema = new mongoose.Schema({}, { strict: false });
const Match = mongoose.model('Match', matchSchema, 'matches');

const updates = [
    { externalId: 537376, home: "Canada", away: "Morocco" },        // W73 vs W75
    { externalId: 537375, home: "Paraguay", away: "France" },      // W74 vs W77
    { externalId: 537377, home: "Brazil", away: "Norway" },        // W76 vs W78
    { externalId: 537378, home: "Mexico", away: "England" },       // W79 vs W80
    { externalId: 537379, home: "Portugal", away: "Spain" },       // W83 vs W84
    { externalId: 537380, home: "United States", away: "Belgium" }, // W81 vs W82
    { externalId: 537381, home: "Switzerland", away: "Colombia" },  // W86 vs W88
    { externalId: 537382, home: "Argentina", away: "Egypt" }        // W85 vs W87
];

async function run() {
    const isTestMode = process.argv.includes('--test');

    if (!MONGODB_URI) {
        console.error("Error: MONGODB_URI is missing in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        if (isTestMode) {
            console.log("--- 🧪 TEST MODE: Printing changes only ---");
        }

        for (const data of updates) {
            const query = { externalId: data.externalId };

            if (isTestMode) {
                const doc = await Match.findOne(query);
                if (doc) {
                    console.log(`[TEST] ID ${data.externalId}:`);
                    console.log(`       FROM: { homeTeam: "${doc.homeTeam}", awayTeam: "${doc.awayTeam}" }`);
                    console.log(`       TO:   { homeTeam: "${data.home}", awayTeam: "${data.away}" } (and removing extra fields)`);
                } else {
                    console.warn(`[TEST] Match ${data.externalId} not found.`);
                }
            } else {
                // $set updates the correct fields
                // $unset removes the mistake fields from the previous run
                const result = await Match.updateOne(query, {
                    $set: {
                        homeTeam: data.home,
                        awayTeam: data.away
                    },
                    $unset: {
                        homeTeamName: "",
                        awayTeamName: ""
                    }
                });

                if (result.matchedCount > 0) {
                    console.log(`✅ Fixed externalId ${data.externalId}: ${data.home} vs ${data.away}`);
                } else {
                    console.error(`❌ externalId ${data.externalId} not found.`);
                }
            }
        }

        console.log("\nFinished.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
