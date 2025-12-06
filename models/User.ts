import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In production, hash this!
    isAdmin: { type: Boolean, default: false },
    totalPoints: { type: Number, default: 0 },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);