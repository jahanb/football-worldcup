import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";

export const dynamic = 'force-dynamic'; // <--- Critical: ensures data isn't cached

export async function GET() {
    try {
        await connectDB();

        // Fetch all matches and sort by Start Time
        const matches = await Match.find({}).sort({ startTime: 1 });

        return NextResponse.json(matches);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}