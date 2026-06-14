import axios from 'axios';
import mongoose from 'mongoose';
import Match from './models/Match.ts'; 
import Prediction from './models/Prediction.ts';
import User from './models/User.ts';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const MONGO_URI = process.env.MONGODB_URI;

const teamNameMapping = {
    "Bosnia-Herzegovina": "Bosnia & Herzegovina",
    "Bosnia and Herzegovina": "Bosnia & Herzegovina",
    "Korea Republic": "South Korea",
    "Czechia": "Czech Republic",
    "USA": "United States",
    "Canada": "Canada" // Added for clarity
};

function calculatePoints(pHome, pAway, aHome, aAway) {
    const ph = Number(pHome), pa = Number(pAway), ah = Number(aHome), aa = Number(aAway);
    let points = 0;
    if (ph === ah) points += 1;
    if (pa === aa) points += 1;
    const pDiff = ph - pa, aDiff = ah - aa;
    if (pDiff === aDiff) points += 1;
    if (Math.sign(pDiff) === Math.sign(aDiff)) points += 2;
    return points;
}

async function syncAndScore() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB...");

        const dateFrom = "2024-01-01"; 
        const dateTo = "2026-12-31"; 

        const response = await axios.get(`https://api.football-data.org/v4/competitions/WC/matches`, {
            headers: { 'X-Auth-Token': API_KEY },
            params: { dateFrom, dateTo }
        });

        const externalMatches = response.data.matches;
        console.log(`API returned ${externalMatches.length} matches.`);

        for (let ext of externalMatches) {
            if (ext.status === 'FINISHED') {
                const hScore = ext.score.fullTime.home;
                const aScore = ext.score.fullTime.away;

                // Map names for both teams
                let apiHome = ext.homeTeam.name;
                let apiAway = ext.awayTeam.name;
                
                const mappedHome = teamNameMapping[apiHome] || apiHome;
                const mappedAway = teamNameMapping[apiAway] || apiAway;

                console.log(`Checking API match: ${apiHome} (${hScore}) vs ${apiAway} (${aScore})`);

                // IMPROVED SEARCH: Match both teams, regardless of Home/Away order
                const match = await Match.findOneAndUpdate(
                    { 
                        isFinished: false,
                        $or: [
                            { homeTeam: mappedHome, awayTeam: mappedAway },
                            { homeTeam: mappedAway, awayTeam: mappedHome }
                        ]
                    },
                    {
                        // We must be careful: if teams were flipped, we must flip the scores too
                        resultHome: (match) => match.homeTeam === mappedHome ? hScore : aScore,
                        resultAway: (match) => match.homeTeam === mappedHome ? aScore : hScore,
                        // For Mongoose findOneAndUpdate, we use the standard assignment:
                        // But wait, it's easier to just detect which is which:
                    },
                    { new: false } // Get the document BEFORE update so we can check team order
                );

                // Re-calculating result logic to handle Home/Away flips
                if (match) {
                    let finalH, finalA;
                    if (match.homeTeam === mappedHome) {
                        finalH = hScore;
                        finalA = aScore;
                    } else {
                        finalH = aScore;
                        finalA = hScore;
                    }

                    // Perform the actual update
                    match.resultHome = finalH;
                    match.resultAway = finalA;
                    match.isFinished = true;
                    match.externalId = ext.id;
                    await match.save();

                    console.log(`✅ UPDATED: ${match.homeTeam} ${finalH}-${finalA} ${match.awayTeam}`);

                    const predictions = await Prediction.find({ matchId: match._id });
                    for (const pred of predictions) {
                        const earned = calculatePoints(pred.predHome, pred.predAway, finalH, finalA);
                        const diff = earned - (pred.points || 0);
                        if (diff !== 0) {
                            await Prediction.findByIdAndUpdate(pred._id, { points: earned });
                            await User.findByIdAndUpdate(pred.userId, { $inc: { totalPoints: diff } });
                        }
                    }
                } else {
                    console.log(`ℹ️ No match found in DB for [${mappedHome} vs ${mappedAway}]`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

syncAndScore();