'use client';
import { useState, useEffect } from 'react';
import { Container, Typography, Paper, TextField, Button, Box, Chip, CircularProgress } from '@mui/material';

export default function AdminDashboard() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch matches on load
    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            // 1. Fetch all matches
            const res = await fetch('/worldcup/api/matches');
            const data = await res.json();
            // 2. Sort: Unfinished first, then by date
            const sorted = data.sort((a: any, b: any) => {
                if (a.isFinished === b.isFinished) return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                return a.isFinished ? 1 : -1;
            });
            setMatches(sorted);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateScore = async (matchId: string, home: string, away: string) => {
        if (home === '' || away === '') return alert("Please enter both scores");

        const confirm = window.confirm(`Set result to ${home} - ${away}? \n\nThis will calculate points for all users immediately.`);
        if (!confirm) return;

        try {
            const res = await fetch('/worldcup/api/admin/set-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, homeScore: home, awayScore: away })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message || "Scores updated!");
                fetchMatches(); // Refresh the list to show the green checkmark
            } else {
                alert(data.error || "Error updating score.");
            }
        } catch (error) {
            alert("Network Error");
        }
    };

    if (loading) return <Container sx={{ mt: 4 }}><CircularProgress /></Container>;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 10 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="error">
                    👮 Referee Dashboard
                </Typography>
                <Typography color="text.secondary">
                    Set the final score for finished games.
                </Typography>
            </Box>

            {matches.map((match: any) => (
                <MatchEditor key={match._id} match={match} onSave={updateScore} />
            ))}

            {matches.length === 0 && <Typography>No matches found.</Typography>}
        </Container>
    );
}

function MatchEditor({ match, onSave }: any) {
    const [h, setH] = useState(match.resultHome ?? '');
    const [a, setA] = useState(match.resultAway ?? '');

    // Format Date
    const dateStr = new Date(match.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: match.isFinished ? '6px solid green' : '6px solid orange' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>

                {/* Match Info */}
                <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                    <Box display="flex" alignItems="center" gap={1} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                        <Typography fontWeight="bold" variant="h6">{match.homeTeam}</Typography>
                        <Typography variant="caption" sx={{ mx: 1 }}>VS</Typography>
                        <Typography fontWeight="bold" variant="h6">{match.awayTeam}</Typography>
                    </Box>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Group {match.group} • {dateStr}
                    </Typography>
                    {match.isFinished && <Chip label="Finished" color="success" size="small" sx={{ mt: 0.5 }} />}
                </Box>

                {/* Inputs */}
                <Box display="flex" alignItems="center" gap={1} sx={{ bgcolor: '#f9f9f9', p: 1, borderRadius: 2 }}>
                    <TextField
                        placeholder="0" size="small" type="number"
                        sx={{ width: 60, bgcolor: 'white' }}
                        value={h} onChange={e => setH(e.target.value)}
                    />
                    <Typography fontWeight="bold">-</Typography>
                    <TextField
                        placeholder="0" size="small" type="number"
                        sx={{ width: 60, bgcolor: 'white' }}
                        value={a} onChange={e => setA(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        color={match.isFinished ? "warning" : "error"}
                        onClick={() => onSave(match._id, h, a)}
                        sx={{ ml: 1 }}
                    >
                        {match.isFinished ? "Update" : "Finish"}
                    </Button>
                </Box>

            </Box>
        </Paper>
    );
}