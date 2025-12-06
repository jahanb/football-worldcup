import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
    homeTeam: String,
    awayTeam: String,
    group: String,
    startTime: Date,
    isFinished: { type: Boolean, default: false },
    resultHome: { type: Number, default: null }, // Actual score
    resultAway: { type: Number, default: null }, // Actual score
});

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);