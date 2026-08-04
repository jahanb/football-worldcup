import axios from 'axios';
import mongoose from 'mongoose';
import Match from './models/Match.ts'; 
import Prediction from './models/Prediction.ts';
import User from './models/User.ts';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGO_URI = process.env.MONGODB_URI;

/**
 * SCORING LOGIC (The 5-Point Rule)
 */
function calculatePoints(pHome, pAway, aHome, aAway) {
    let points = 0;
    
    const ph = Number(pHome);
    const pa = Number(pAway);
    const ah = Number(aHome);
    const aa = Number(aAway);

    // Rule 1: Correct number of goals per team (1 pt each)
    if (ph === ah) points += 1;
    if (pa === aa) points += 1;

    // Rule 2: Correct Goal Difference (1 pt)
    const predDiff = ph - pa;
    const actDiff = ah - aa;
    if (predDiff === actDiff) points += 1;

    // Rule 3: Correct Result Win/Draw/Loss (2 pts)
    if (Math.sign(predDiff) === Math.sign(actDiff)) points += 2;

    return points;
}

async function syncAndScore() {
    try {
        console.log(`[${new Date().toLocaleString()}] Starting Sync...`);
        await mongoose.connect(MONGO_URI);

        // 1. Get Today's Date for filtering
        const todayStr = new Date().toISOString().split('T')[0];

        // 2. Fetch matches from API (Filtered for World Cup 'WC')
        const response = await axios.get(`https://api.football-data.org/v4/competitions/WC/matches`, {
            headers: { 'X-Auth-Token': API_KEY },
            params: { dateFrom: todayStr, dateTo: todayStr } // Production: only today
        });

        const externalMatches = response.data.matches;

        if (!externalMatches || externalMatches.length === 0) {
            console.log("No World Cup matches scheduled for today.");
            return;
        }

        for (let ext of externalMatches) {
            if (ext.status === 'FINISHED') {
                const hScore = ext.score.fullTime.home;
                const aScore = ext.score.fullTime.away;

                if (hScore === null || aScore === null) continue;

                // 3. Find and Update the Match
                // We use homeTeam name and today's date to prevent matching wrong years
                const match = await Match.findOneAndUpdate(
                    { 
                        homeTeam: ext.homeTeam.name,
                        isFinished: false, // Only process matches not yet "closed"
                        startTime: {
                            $gte: new Date(todayStr + "T00:00:00Z"),
                            $lte: new Date(todayStr + "T23:59:59Z")
                        }
                    },
                    {
                        resultHome: hScore,
                        resultAway: aScore,
                        isFinished: true,
                        externalId: ext.id
                    },
                    { new: true }
                );

                if (match) {
                    console.log(`✅ MATCH FINISHED: ${match.homeTeam} ${hScore}-${aScore} ${match.awayTeam}`);
                    
                    // 4. Find all predictions for this match
                    const predictions = await Prediction.find({ matchId: match._id });
                    console.log(`   Found ${predictions.length} predictions to calculate.`);

                    for (const pred of predictions) {
                        const earned = calculatePoints(pred.predHome, pred.predAway, hScore, aScore);
                        
                        // Use point difference logic to avoid double-counting if script re-runs
                        const oldPoints = pred.points || 0;
                        const diff = earned - oldPoints;

                        if (diff !== 0) {
                            // Update individual prediction record
                            await Prediction.findByIdAndUpdate(pred._id, { points: earned });

                            // Update User's total points in the ranking collection
                            await User.findByIdAndUpdate(pred.userId, { 
                                $inc: { totalPoints: diff } 
                            });
                            
                            console.log(`   👤 User ${pred.userId} awarded ${earned} points (Diff: ${diff})`);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('❌ Sync/Score Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log("Sync Finished.");
        process.exit();
    }
}

syncAndScore();
