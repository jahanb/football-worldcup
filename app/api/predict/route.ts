import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Prediction from "@/models/Prediction";
import Match from "@/models/Match";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchId, home, away } = await req.json();
    await connectDB();

    const match = await Match.findById(matchId);
    if (new Date() > match.startTime) {
        return NextResponse.json({ error: 'Match already started' }, { status: 400 });
    }

    await Prediction.findOneAndUpdate(
        { userId: session.user.id, matchId },
        { predHome: home, predAway: away },
        { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
}