'use client';
import { useState } from 'react';

export default function PredictForm({ matchId, initialHome, initialAway }: any) {
    const [home, setHome] = useState(initialHome ?? '');
    const [away, setAway] = useState(initialAway ?? '');
    const [loading, setLoading] = useState(false);

    const save = async () => {
        setLoading(true);
        await fetch('/api/predict', {
            method: 'POST',
            body: JSON.stringify({ matchId, home: Number(home), away: Number(away) }),
        });
        setLoading(false);
        alert('Saved!');
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2 items-center">
                <input type="number" className="border w-10 text-center" value={home} onChange={e => setHome(e.target.value)} />
                <span>-</span>
                <input type="number" className="border w-10 text-center" value={away} onChange={e => setAway(e.target.value)} />
            </div>
            <button onClick={save} disabled={loading} className="text-xs bg-blue-600 text-white px-3 py-1 rounded">
                {loading ? '...' : 'Predict'}
            </button>
        </div>
    );
}