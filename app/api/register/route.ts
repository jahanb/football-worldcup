import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password required" }, { status: 400 });
        }

        await connectDB();

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return NextResponse.json({ error: "Username already taken" }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        await User.create({
            username,
            password: hashedPassword,
            isAdmin: false,
            totalPoints: 0
        });

        return NextResponse.json({ success: true }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}