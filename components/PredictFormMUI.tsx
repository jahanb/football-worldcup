'use client';
import { useState } from 'react';
import { TextField, Button, Box, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';

export default function PredictFormMUI({ matchId, initialHome, initialAway }: any) {
    const [home, setHome] = useState(initialHome ?? '');
    const [away, setAway] = useState(initialAway ?? '');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // FIX: Track if a prediction exists using state, so it updates immediately after saving
    const [hasPrediction, setHasPrediction] = useState(initialHome !== undefined && initialHome !== null);

    const save = async () => {
        // Basic validation
        if (home === '' || away === '') return;

        setLoading(true);
        setSaved(false);

        try {
            const res = await fetch('/worldcup/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, home: Number(home), away: Number(away) }),
            });

            if (res.ok) {
                setLoading(false);
                setSaved(true);
                setHasPrediction(true); // <--- This forces the button to switch to "Update" mode

                // Reset "Saved" label after 2 seconds
                setTimeout(() => setSaved(false), 2000);
            } else {
                setLoading(false);
                alert('Failed to save');
            }
        } catch (error) {
            setLoading(false);
            alert('Network error');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === '-' || e.key === 'e') {
            e.preventDefault();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={home}
                    onChange={e => setHome(e.target.value)}
                    onKeyDown={handleKeyDown}
                    inputProps={{ min: 0, style: { textAlign: 'center' } }}
                    sx={{ width: 60, bgcolor: 'white' }}
                />
                <span style={{ fontWeight: 'bold' }}>-</span>
                <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={away}
                    onChange={e => setAway(e.target.value)}
                    onKeyDown={handleKeyDown}
                    inputProps={{ min: 0, style: { textAlign: 'center' } }}
                    sx={{ width: 60, bgcolor: 'white' }}
                />
            </Box>
            <Button
                // Logic: 
                // 1. Saved = Green (Success)
                // 2. Has Prediction = Orange (Warning/Edit)
                // 3. New = Blue (Primary)
                color={saved ? "success" : (hasPrediction ? "warning" : "primary")}
                variant={saved ? "contained" : "outlined"}
                size="small"
                onClick={save}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : (saved ? <SaveIcon /> : (hasPrediction ? <EditIcon /> : null))}
                sx={{ minWidth: 120, fontSize: '0.75rem' }}
            >
                {loading ? '...' : (saved ? 'Saved' : (hasPrediction ? 'Update Predict' : 'Predict'))}
            </Button>
        </Box>
    );
}