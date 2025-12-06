import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";
import Prediction from "@/models/Prediction";
import User from "@/models/User";
import { calculatePoints } from "@/lib/scoring";

export async function POST(req: Request) {
    const { matchId, homeScore, awayScore } = await req.json();
    await connectDB();

    // 1. Update Match Result
    const match = await Match.findByIdAndUpdate(matchId, {
        resultHome: homeScore,
        resultAway: awayScore,
        isFinished: true
    }, { new: true });

    // 2. Find all predictions for this match
    const predictions = await Prediction.find({ matchId });

    // 3. Calculate points and update predictions
    for (const pred of predictions) {
        const points = calculatePoints(pred.predHome, pred.predAway, homeScore, awayScore);
        pred.points = points;
        await pred.save();

        // 4. Update User Total Score
        await User.findByIdAndUpdate(pred.userId, {
            $inc: { totalPoints: points }
        });
    }

    return NextResponse.json({ success: true, message: "Scores updated" });
}