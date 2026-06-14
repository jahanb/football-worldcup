import axios from 'axios';
import mongoose from 'mongoose';
import Match from './models/Match.ts'; // Importing your actual model
import dotenv from 'dotenv';

// Load environment variables (useful for MONGO_URI and API_KEY)
dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY || '770664b6b77e4a95a4f9372bd61dc9e0';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function syncActiveResults() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateFrom = yesterday.toISOString().split('T')[0];
        const dateTo = today.toISOString().split('T')[0];

        console.log(`Fetching active matches (${dateFrom} to ${dateTo})...`);

        const response = await axios.get(`https://api.football-data.org/v4/competitions/WC/matches`, {
            headers: { 'X-Auth-Token': API_KEY },
            params: { dateFrom, dateTo }
        });

        const externalMatches = response.data.matches;
        let updates = 0;

        if (!externalMatches || externalMatches.length === 0) {
            console.log('No matches found in this window.');
        } else {
            for (let ext of externalMatches) {
                if (ext.status === 'FINISHED' || ext.status === 'IN_PLAY') {
                    
                    // Use your model to find and update
                    const updatedMatch = await Match.findOneAndUpdate(
                        { 
                            // Try to match by ID if we have it, otherwise by homeTeam name
                            $or: [
                                { externalId: ext.id },
                                { homeTeam: new RegExp(`^${ext.homeTeam.shortName || ext.homeTeam.name}$`, 'i') }
                            ],
                            isFinished: false 
                        },
                        {
                            resultHome: ext.score.fullTime.home,
                            resultAway: ext.score.fullTime.away,
                            isFinished: ext.status === 'FINISHED',
                            externalId: ext.id
                        },
                        { new: true }
                    );

                    if (updatedMatch) {
                        const icon = ext.status === 'FINISHED' ? '✅' : '🔴 LIVE';
                        console.log(`${icon} Updated: ${updatedMatch.homeTeam} ${ext.score.fullTime.home}-${ext.score.fullTime.away} ${updatedMatch.awayTeam}`);
                        updates++;
                    }
                }
            }
        }

        console.log(`\nSync Complete. ${updates} matches processed.`);
    } catch (err) {
        console.error('❌ Sync Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

syncActiveResults();
