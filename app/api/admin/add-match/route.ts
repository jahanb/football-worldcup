import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";

export async function POST(req: Request) {
    const body = await req.json();
    await connectDB();

    await Match.create({
        homeTeam: body.homeTeam,
        awayTeam: body.awayTeam,
        group: body.group,
        startTime: body.startTime,
        isFinished: false
    });

    return NextResponse.json({ success: true });
}