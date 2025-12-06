import { NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";
import Prediction from "@/models/Prediction";

export async function GET() {
    await connectDB();

    // 1. CLEANUP: Clear existing matches and predictions
    await Match.deleteMany({});
    await Prediction.deleteMany({});

    // 2. DEFINE THE DATA WITH LONG PLAY-OFF NAMES
    const groupsData: Record<string, string[]> = {
        "A": ["Mexico", "South Africa", "South Korea", "Denmark-North Macedonia-Czechia-Republic of Ireland"],

        "B": ["Canada", "Switzerland", "Qatar", "Italy-Northern Ireland-Wales-Bosnia & Herzegovina"],

        "C": ["Brazil", "Morocco", "Scotland", "Haiti"],

        "D": ["United States", "Paraguay", "Australia", "Turkey-Romania-Slovakia-Kosovo"],

        "E": ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],

        "F": ["Netherlands", "Japan", "Tunisia", "Ukraine-Sweden-Poland-Albania"],

        "G": ["Belgium", "Egypt", "Iran", "New Zealand"],

        "H": ["Spain", "Uruguay", "Saudi Arabia", "Cape Verde"],

        "I": ["France", "Senegal", "Norway", "Bolivia-Iraq-Suriname"],

        "J": ["Argentina", "Algeria", "Austria", "Jordan"],

        "K": ["Portugal", "Colombia", "Uzbekistan", "DR Congo-Jamaica-New Caledonia"],

        "L": ["England", "Croatia", "Panama", "Ghana"],
    };

    const matchesToInsert = [];

    // Starting Date: June 11, 2026
    let currentDate = new Date("2026-06-11T14:00:00");

    // 3. GENERATE ROUND ROBIN MATCHES
    for (const [groupName, teams] of Object.entries(groupsData)) {
        // Round Robin Logic (Everyone plays everyone)
        // 0vs1, 2vs3, 0vs2, 1vs3, 0vs3, 1vs2
        const pairings = [
            [0, 1], [2, 3],
            [0, 2], [1, 3],
            [0, 3], [1, 2]
        ];

        for (const pair of pairings) {
            matchesToInsert.push({
                homeTeam: teams[pair[0]],
                awayTeam: teams[pair[1]],
                group: groupName,
                startTime: new Date(currentDate),
                isFinished: false,
                resultHome: null,
                resultAway: null
            });

            // Advance time logic (3 matches per day approx)
            currentDate.setHours(currentDate.getHours() + 3);
            if (currentDate.getHours() > 22) {
                currentDate.setDate(currentDate.getDate() + 1);
                currentDate.setHours(14, 0, 0, 0);
            }
        }
    }

    // 4. INSERT INTO DB
    await Match.insertMany(matchesToInsert);

    return NextResponse.json({
        success: true,
        message: `Database re-seeded with ${matchesToInsert.length} matches.`
    });
}