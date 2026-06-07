const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = 'mongodb://localhost:27017/test'; 

const matchSchema = new mongoose.Schema({
    homeTeam: String,
    awayTeam: String,
    group: String,
    city: String,
    startTime: Date,
    isFinished: { type: Boolean, default: false },
    resultHome: { type: Number, default: null },
    resultAway: { type: Number, default: null }
});

const Match = mongoose.model('Match', matchSchema);

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const rawData = fs.readFileSync('worldcup.json');
        const data = JSON.parse(rawData);

        const formattedMatches = data.matches.map(m => {
            // 1. Split "13:00 UTC-6" into "13:00" and "-6"
            const parts = m.time.split(' ');
            const timePart = parts[0]; // "13:00"
            const zonePart = parts[1].replace('UTC', ''); // "-6" or "-10" or "+4"

            // 2. Properly format the offset (e.g., "-6" becomes "-06:00")
            const sign = zonePart.startsWith('-') ? '-' : '+';
            const absValue = zonePart.replace(/[+-]/, ''); // Remove the sign to get just the number
            const paddedValue = absValue.padStart(2, '0'); // Ensure it is 2 digits (e.g., "06")
            const formattedOffset = `${sign}${paddedValue}:00`;

            // 3. Construct ISO string: "2026-06-11T13:00:00-06:00"
            const isoString = `${m.date}T${timePart}:00${formattedOffset}`;
            const utcDate = new Date(isoString);

            // 4. Check if date is valid
            if (isNaN(utcDate.getTime())) {
                throw new Error(`Invalid Date produced from string: ${isoString}`);
            }

            console.log(`Match: ${m.team1} vs ${m.team2}`);
            console.log(`   Local: ${m.date} ${m.time} -> UTC: ${utcDate.toISOString()}`);

            return {
                homeTeam: m.team1,
                awayTeam: m.team2,
                group: m.group || m.round,
                city: m.ground,
                startTime: utcDate,
                isFinished: false,
                resultHome: null,
                resultAway: null
            };
        });

        console.log('Clearing old matches...');
        await Match.deleteMany({}); 
        
        await Match.insertMany(formattedMatches);
        console.log(`\nSUCCESS: Imported ${formattedMatches.length} matches.`);

    } catch (error) {
        console.error('\n--- ERROR DURING SEEDING ---');
        console.error(error.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

seedDatabase();
