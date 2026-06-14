import axios from 'axios';
import mongoose from 'mongoose';
import Match from './models/Match.ts'; 
import dotenv from 'dotenv';
dotenv.config();

async function discover() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Searching for all matches in the API...");

    // 1. Fetch ALL matches for the competition (No date filter)
    const response = await axios.get(`https://api.football-data.org/v4/competitions/WC/matches`, {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY }
    });

    const extMatches = response.data.matches;
    console.log(`API returned ${extMatches.length} matches.`);

    for (let ext of extMatches) {
        // Find match by name
        const match = await Match.findOneAndUpdate(
            { 
                homeTeam: new RegExp(`^${ext.homeTeam.name}$`, 'i'),
                externalId: null // Only update if not already linked
            },
            { externalId: ext.id }, // Save the ID for future 100% accuracy
            { new: true }
        );

        if (match) {
            console.log(`🔗 Linked ID ${ext.id} to ${match.homeTeam}`);
        }
    }
    console.log("Discovery Complete.");
    process.exit();
}
discover();