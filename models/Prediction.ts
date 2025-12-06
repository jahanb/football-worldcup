import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    predHome: Number,
    predAway: Number,
    points: { type: Number, default: 0 },
});

// Ensure one prediction per match per user
PredictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });

export default mongoose.models.Prediction || mongoose.model('Prediction', PredictionSchema);