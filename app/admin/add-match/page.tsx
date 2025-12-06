'use client';
import { useState } from 'react';

export default function AddMatchPage() {
    const [form, setForm] = useState({
        homeTeam: '',
        awayTeam: '',
        group: 'A',
        date: '',
        time: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Combine date and time
        const startTime = new Date(`${form.date}T${form.time}`);

        const res = await fetch('/worldcup/api/admin/add-match', {
            method: 'POST',
            body: JSON.stringify({ ...form, startTime }),
        });

        if (res.ok) {
            alert('Match Added!');
            setForm({ ...form, homeTeam: '', awayTeam: '' }); // Clear form
        } else {
            alert('Error adding match');
        }
    };

    return (
        <div className="p-8 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6">Add New Match</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    placeholder="Home Team (e.g. Brazil)"
                    className="border p-2 rounded"
                    value={form.homeTeam}
                    onChange={e => setForm({ ...form, homeTeam: e.target.value })}
                    required
                />
                <input
                    placeholder="Away Team (e.g. Germany)"
                    className="border p-2 rounded"
                    value={form.awayTeam}
                    onChange={e => setForm({ ...form, awayTeam: e.target.value })}
                    required
                />
                <select
                    className="border p-2 rounded"
                    value={form.group}
                    onChange={e => setForm({ ...form, group: e.target.value })}
                >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => <option key={g} value={g}>Group {g}</option>)}
                </select>

                <div className="flex gap-2">
                    <input
                        type="date"
                        className="border p-2 rounded w-full"
                        value={form.date}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        required
                    />
                    <input
                        type="time"
                        className="border p-2 rounded w-full"
                        value={form.time}
                        onChange={e => setForm({ ...form, time: e.target.value })}
                        required
                    />
                </div>

                <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Match</button>
            </form>
        </div>
    );
}