const mongoose = require('mongoose');

// 1. DATABASE CONFIGURATION
// Replace the URI with your actual MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/test'; 

// 2. DEFINE SCHEMAS (Simplified for the script)
const UserSchema = new mongoose.Schema({
    totalPoints: { type: Number, default: 0 }
});

const PredictionSchema = new mongoose.Schema({
    points: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Prediction = mongoose.model('Prediction', PredictionSchema);

// 3. THE RESET FUNCTION
async function resetTournamentPoints() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully.');

        // Reset User Total Points
        console.log('Resetting User scores...');
        const userUpdate = await User.updateMany({}, { $set: { totalPoints: 0 } });
        console.log(`Updated ${userUpdate.modifiedCount} users.`);

        // Reset Individual Prediction Points
        console.log('Resetting Prediction records...');
        const predUpdate = await Prediction.updateMany({}, { $set: { points: 0 } });
        console.log(`Updated ${predUpdate.modifiedCount} prediction entries.`);

        console.log('-----------------------------------------');
        console.log('SUCCESS: All points have been reset to 0.');
        console.log('-----------------------------------------');

    } catch (error) {
        console.error('ERROR during reset:', error);
    } finally {
        // Close the connection so the script ends
        await mongoose.disconnect();
        process.exit();
    }
}

// Run the script
resetTournamentPoints();