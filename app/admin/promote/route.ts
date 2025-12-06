import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
    // 1. Get username from URL ?username=yourname
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) return NextResponse.json({ error: "Provide ?username=..." });

    await connectDB();

    // 2. Update user
    const user = await User.findOneAndUpdate(
        { username },
        { isAdmin: true },
        { new: true }
    );

    return NextResponse.json({
        message: `User ${username} is now an Admin!`,
        user
    });
}