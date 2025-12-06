'use client';
import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Grid, TextField, Button, Box, Chip } from '@mui/material';

export default function AdminDashboard() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch unfinished matches
    useEffect(() => {
        fetch('/worldcup/api/seed') // Re-using seed endpoint? No, let's just fetch matches directly via a new helper or filter on client for simplicity here
            .then(() => fetchMatches());
    }, []);

    const fetchMatches = async () => {
        // In a real app, create a dedicated GET endpoint. 
        // Here we use a trick: We fetch the main page props logic via a client API if available, 
        // or just fetch all and filter client side.
        // Let's create a quick API helper inside this file? No, better to use the seed data or create a simple list API.
        // Actually, let's just create a quick "Get All Matches" API route.
        const res = await fetch('/worldcup/api/matches'); // See Step 3
        const data = await res.json();
        setMatches(data.filter((m: any) => !m.isFinished));
        setLoading(false);
    };

    const updateScore = async (matchId: string, home: string, away: string) => {
        if (home === '' || away === '') return alert("Enter scores");

        const confirm = window.confirm(`Set result to ${home} - ${away}? This will calculate points for everyone.`);
        if (!confirm) return;

        const res = await fetch('/worldcup/api/admin/set-result', {
            method: 'POST',
            body: JSON.stringify({ matchId, homeScore: home, awayScore: away })
        });

        if (res.ok) {
            alert("Scores updated and points calculated!");
            fetchMatches(); // Refresh list
        } else {
            alert("Error updating.");
        }
    };

    if (loading) return <Container sx={{ mt: 4 }}>Loading...</Container>;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 10 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold" color="error">
                👮 Admin Referee Dashboard
            </Typography>
            <Typography paragraph>
                Enter the final score below. <b>Warning:</b> This will immediately calculate points for all users.
            </Typography>

            {matches.map((match: any) => (
                <MatchEditor key={match._id} match={match} onSave={updateScore} />
            ))}

            {matches.length === 0 && <Typography>No active matches found.</Typography>}
        </Container>
    );
}

function MatchEditor({ match, onSave }: any) {
    const [h, setH] = useState('');
    const [a, setA] = useState('');

    return (
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ minWidth: 200 }}>
                <Typography fontWeight="bold">{match.homeTeam} vs {match.awayTeam}</Typography>
                <Typography variant="caption" color="text.secondary">Group {match.group}</Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
                <TextField
                    placeholder="0" size="small" sx={{ width: 60 }} type="number"
                    value={h} onChange={e => setH(e.target.value)}
                />
                <Typography>-</Typography>
                <TextField
                    placeholder="0" size="small" sx={{ width: 60 }} type="number"
                    value={a} onChange={e => setA(e.target.value)}
                />
                <Button variant="contained" color="error" onClick={() => onSave(match._id, h, a)}>
                    Finish
                </Button>
            </Box>
        </Paper>
    );
}