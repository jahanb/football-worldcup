import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Prediction from "@/models/Prediction";
import Match from "@/models/Match";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId, home, away } = await req.json();
    await connectDB();

    const match = await Match.findById(matchId);
    if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // --- BULLETPROOF LOCKDOWN LOGIC ---
    const now = Date.now(); // Current UTC time in milliseconds
    const matchStartTime = new Date(match.startTime).getTime(); // Kickoff in milliseconds
    const oneHourInMs = 60 * 60 * 1000;
    
    const lockTime = matchStartTime - oneHourInMs;

    // LOGGING (Check your terminal/logs to see these numbers)
    console.log(`Match: ${match.homeTeam} vs ${match.awayTeam}`);
    console.log(`Current Time: ${new Date(now).toISOString()}`);
    console.log(`Lockdown At:  ${new Date(lockTime).toISOString()}`);

    if (now > lockTime) {
        console.log("❌ BLOCKED: Prediction attempted after lockdown.");
        return NextResponse.json({ 
            error: 'Predictions locked! Changes must be made at least 1 hour before kickoff.' 
        }, { status: 403 });
    }
    // --- END LOCKDOWN LOGIC ---

    // If we passed the check, save the prediction
    await Prediction.findOneAndUpdate(
        { userId: session.user.id, matchId },
        { predHome: home, predAway: away },
        { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
}