import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
     homeTeam: String,
       awayTeam: String,
       group: String,
       city: String,
       startTime: Date,
       isFinished: { type: Boolean, default: false },
       resultHome: { type: Number, default: null },
       resultAway: { type: Number, default: null },
       externalId: { type: Number, default: null }
});

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
