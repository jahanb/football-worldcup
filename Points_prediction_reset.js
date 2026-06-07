const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/test'; 

const User = mongoose.model('User', new mongoose.Schema({ totalPoints: Number }));
const Prediction = mongoose.model('Prediction', new mongoose.Schema({}));

async function masterReset() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected. Starting Master Reset...');

        // 1. Reset Users
        const userRes = await User.updateMany({}, { $set: { totalPoints: 0 } });
        console.log(`- Reset points for ${userRes.modifiedCount} users.`);

        // 2. Clear Predictions
        const predRes = await Prediction.deleteMany({});
        console.log(`- Deleted ${predRes.deletedCount} prediction entries.`);

        console.log('DONE: Database ready for a new tournament.');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

masterReset();