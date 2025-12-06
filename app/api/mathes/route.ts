import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";

export async function GET() {
    await connectDB();
    const matches = await Match.find({}).sort({ startTime: 1 });
    return NextResponse.json(matches);
}