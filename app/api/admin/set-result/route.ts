import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";
import Prediction from "@/models/Prediction";
import User from "@/models/User";
import mongoose from 'mongoose';

// IMPROVED SCORING LOGIC
function calculatePoints(pHome: number, pAway: number, aHome: number, aAway: number) {
    let points = 0;
    const breakdown = [];

    // Rule 1: Goals (1 pt each)
    if (pHome === aHome) { points += 1; breakdown.push("H-Goal"); }
    if (pAway === aAway) { points += 1; breakdown.push("A-Goal"); }

    // Rule 2: Difference (1 pt)
    const pDiff = pHome - pAway;
    const aDiff = aHome - aAway;
    if (pDiff === aDiff) { points += 1; breakdown.push("Diff"); }

    // Rule 3: Result (2 pts)
    const pSign = Math.sign(pDiff);
    const aSign = Math.sign(aDiff);
    if (pSign === aSign) { points += 2; breakdown.push("Result"); }

    return { points, breakdown };
}

export async function POST(req: Request) {
    try {
        const { matchId, homeScore, awayScore } = await req.json();

        // 1. Force everything to Numbers immediately
        const h = Number(homeScore);
        const a = Number(awayScore);

        if (isNaN(h) || isNaN(a)) {
            return NextResponse.json({ error: "Invalid scores provided" }, { status: 400 });
        }

        await connectDB();

        // 2. Update the Match first
        const match = await Match.findByIdAndUpdate(matchId, {
            resultHome: h,
            resultAway: a,
            isFinished: true
        }, { new: true });

        if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

        // 3. Find Predictions
        // Use mongoose.Types.ObjectId to ensure the query is perfectly accurate
        const predictions = await Prediction.find({ 
            matchId: new mongoose.Types.ObjectId(matchId) 
        });

        console.log(`Processing ${predictions.length} predictions for ${match.homeTeam} vs ${match.awayTeam}`);

        for (const pred of predictions) {
            // FIX: Explicitly cast DB values to Numbers before calculating
            const pHome = Number(pred.predHome);
            const pAway = Number(pred.predAway);

            const { points, breakdown } = calculatePoints(pHome, pAway, h, a);

            // 4. Atomic Point Difference Calculation
            // This handles cases where you update a score multiple times
            const oldPoints = Number(pred.points) || 0;
            const diff = points - oldPoints;

            // Update individual prediction
            pred.points = points;
            await pred.save();

            // Update user total
            if (diff !== 0) {
                await User.findByIdAndUpdate(pred.userId, {
                    $inc: { totalPoints: diff }
                });
            }

            console.log(`User ${pred.userId}: Pred ${pHome}-${pAway} | Actual ${h}-${a} | Earned: ${points} | Diff added: ${diff}`);
        }

        return NextResponse.json({ success: true, count: predictions.length });

    } catch (error: any) {
        console.error("ADMIN API ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}