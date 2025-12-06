import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";
import Prediction from "@/models/Prediction";
import User from "@/models/User";

// YOUR SPECIFIC SCORING RULES
function calculatePoints(predHome: number, predAway: number, actHome: number, actAway: number) {
    let points = 0;
    const breakdown = [];

    // Rule 1: Number of goals of each team (1 point each)
    if (predHome === actHome) { points += 1; breakdown.push("HomeGoal"); }
    if (predAway === actAway) { points += 1; breakdown.push("AwayGoal"); }

    // Rule 2: Correct Difference (1 point)
    const predDiff = predHome - predAway;
    const actDiff = actHome - actAway;
    if (predDiff === actDiff) { points += 1; breakdown.push("Diff"); }

    // Rule 3: Correct Result (Win/Draw/Loss) (2 points)
    // Win (>0), Draw (0), Loss (<0)
    const predSign = Math.sign(predDiff);
    const actSign = Math.sign(actDiff);

    // We only award result points if the outcome is actually the same
    // (e.g. Home Win matched Home Win)
    if (predSign === actSign) { points += 2; breakdown.push("Result"); }

    return { points, breakdown };
}

export async function POST(req: Request) {
    try {
        const { matchId, homeScore, awayScore } = await req.json();

        // Convert inputs to numbers just in case
        const h = Number(homeScore);
        const a = Number(awayScore);

        console.log(`\n🏁 ADMIN: Ending Match ${matchId} with score ${h}-${a}`);

        await connectDB();

        // 1. Update the Match
        const match = await Match.findByIdAndUpdate(matchId, {
            resultHome: h,
            resultAway: a,
            isFinished: true
        }, { new: true });

        if (!match) {
            console.log("❌ Match not found");
            return NextResponse.json({ error: "Match not found" }, { status: 404 });
        }

        // 2. Find Predictions for this match
        // We use the string version of matchId to ensure it matches
        const predictions = await Prediction.find({ matchId: matchId });

        console.log(`📊 Found ${predictions.length} predictions for this match.`);

        // 3. Calculate and Update
        let updatedCount = 0;

        for (const pred of predictions) {
            // Calculate
            const { points, breakdown } = calculatePoints(pred.predHome, pred.predAway, h, a);

            console.log(`   👤 User: ${pred.userId} | Pred: ${pred.predHome}-${pred.predAway} | Points: ${points} [${breakdown.join(',')}]`);

            // Avoid double counting: 
            // If we already calculated points for this match before, we should deduct them first
            // But for simplicity in this MVP, we assume this is the first time setting the result.
            // If you edit a score (e.g. fix a mistake), we need to be careful. 
            // Ideally, we subtract the old points, but here we will just overwrite.

            const oldPoints = pred.points || 0;
            const pointDifference = points - oldPoints;

            // Update Prediction
            pred.points = points;
            await pred.save();

            // Update User Total
            // We add the DIFFERENCE (so if they had 0, we add 5. If they had 3 and we correct it to 5, we add 2).
            await User.findByIdAndUpdate(pred.userId, {
                $inc: { totalPoints: pointDifference }
            });

            updatedCount++;
        }

        console.log("✅ Updates Complete\n");

        return NextResponse.json({
            success: true,
            message: `Match finished. Updated ${updatedCount} users.`
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}