// 1. Setup API Details (Get your key from football-data.org)
const API_KEY = '770664b6b77e4a95a4f9372bd61dc9e0';
const axios = require('axios');
const mongoose = require('mongoose');

// --- CONFIGURATION ---
const MONGO_URI = 'mongodb://localhost:27017/test'; 

// --- LOCAL SCHEMA DEFINITION ---
// This replaces the need to "require" your model file
const matchSchema = new mongoose.Schema({
    homeTeam: String,
    awayTeam: String,
    city: String,
    startTime: Date,
    isFinished: { type: Boolean, default: false },
    resultHome: { type: Number, default: null },
    resultAway: { type: Number, default: null },
    externalId: { type: Number, unique: true, sparse: true }
});

// Create the model locally in this script
const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

async function syncResults() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to Database.');

        console.log('Fetching scores from API...');
        // 'WC' is the code for World Cup. 
        // Note: Free tier might only show matches for current/active competitions.
        const response = await axios.get('https://api.football-data.org/v4/competitions/WC/matches', {
            headers: { 'X-Auth-Token': API_KEY }
        });

        const externalMatches = response.data.matches;
        let updates = 0;

        for (let ext of externalMatches) {
            if (ext.status === 'FINISHED') {
                // Try to find the match in your DB by team name
                // We use a Regex 'i' to be case-insensitive
                const myMatch = await Match.findOneAndUpdate(
                    { 
                        homeTeam: new RegExp(`^${ext.homeTeam.shortName || ext.homeTeam.name}$`, 'i'),
                        isFinished: false 
                    },
                    {
                        resultHome: ext.score.fullTime.home,
                        resultAway: ext.score.fullTime.away,
                        isFinished: true,
                        externalId: ext.id
                    }
                );

                if (myMatch) {
                    console.log(`✨ Updated: ${myMatch.homeTeam} ${ext.score.fullTime.home}-${ext.score.fullTime.away} ${myMatch.awayTeam}`);
                    updates++;
                }
            }
        }

        console.log(`\nDONE: ${updates} matches updated.`);

    } catch (err) {
        console.error('❌ ERROR:', err.message);
        if (err.response) console.log('Data:', err.response.data);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

syncResults();