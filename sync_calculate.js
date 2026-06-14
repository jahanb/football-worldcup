import axios from 'axios';
import mongoose from 'mongoose';
import Match from './models/Match.ts';
import Prediction from './models/Prediction.ts';
import User from './models/User.ts';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGO_URI = process.env.MONGODB_URI;

async function calculatePointsForMatch(matchId, resHome, resAway) {
    console.log(`Calculating points for Match ID: ${matchId} (${resHome}-${resAway})`);
    
    // Find all predictions for this match that haven't been awarded points yet
    const predictions = await Prediction.find({ matchId, points: 0 });

    for (let pred of predictions) {
        let earnedPoints = 0;

        // 1. Check for Exact Score (3 Points)
        if (pred.predHome === resHome && pred.predAway === resAway) {
            earnedPoints = 3;
        } 
        // 2. Check for Correct Outcome (1 Point)
        // (Home Win, Away Win, or Draw)
        else {
            const actualOutcome = Math.sign(resHome - resAway);
            const predictedOutcome = Math.sign(pred.predHome - pred.predAway);
            
            if (actualOutcome === predictedOutcome) {
                earnedPoints = 1;
            }
        }

        if (earnedPoints > 0) {
            // Update individual prediction points
            await Prediction.findByIdAndUpdate(pred._id, { points: earnedPoints });
            
            // Increment user's total points in the User collection
            await User.findByIdAndUpdate(pred.userId, { 
                $inc: { totalPoints: earnedPoints } 
            });
            
            console.log(`   - User ${pred.userId} earned ${earnedPoints} pts`);
        }
    }
}

async function syncResults() {
    try {
        await mongoose.connect(MONGO_URI);
        
        // Fetch active matches from API (Last 24 hours)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const response = await axios.get(`https://api.football-data.org/v4/competitions/WC/matches`, {
            headers: { 'X-Auth-Token': API_KEY },
            params: { 
                dateFrom: yesterday.toISOString().split('T')[0],
                dateTo: today.toISOString().split('T')[0]
            }
        });

        const matches = response.data.matches;

        for (let extMatch of matches) {
            if (extMatch.status === 'FINISHED') {
                // Find and Update the Match in our DB
                const updatedMatch = await Match.findOneAndUpdate(
                    { 
                        $or: [{ externalId: extMatch.id }, { homeTeam: extMatch.homeTeam.name }],
                        isFinished: false // Only process if we haven't finished it yet
                    },
                    {
                        resultHome: extMatch.score.fullTime.home,
                        resultAway: extMatch.score.fullTime.away,
                        isFinished: true,
                        externalId: extMatch.id
                    },
                    { new: true }
                );

                if (updatedMatch) {
                    console.log(`✅ Result Updated: ${updatedMatch.homeTeam} vs ${updatedMatch.awayTeam}`);
                    
                    // --- TRIGGER POINT CALCULATION ---
                    await calculatePointsForMatch(
                        updatedMatch._id, 
                        updatedMatch.resultHome, 
                        updatedMatch.resultAway
                    );
                }
            }
        }
    } catch (err) {
        console.error('Sync error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

syncResults();