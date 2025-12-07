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

    // Check if this is an update (did we have initial values?)
    const isUpdate = initialHome !== undefined && initialHome !== null;

    const save = async () => {
        // Basic validation: prevent empty submissions if desired
        if (home === '' || away === '') return;

        setLoading(true);
        setSaved(false);
        await fetch('/worldcup/api/predict', {
            method: 'POST',
            body: JSON.stringify({ matchId, home: Number(home), away: Number(away) }),
        });
        setLoading(false);
        setSaved(true);

        // Reset "Saved" state after 2 seconds
        setTimeout(() => setSaved(false), 2000);
    };

    // Helper to prevent negative inputs
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
                    onKeyDown={handleKeyDown} // <--- Blocks negative sign
                    inputProps={{ min: 0, style: { textAlign: 'center' } }} // <--- Min 0
                    sx={{ width: 60, bgcolor: 'white' }}
                />
                <span style={{ fontWeight: 'bold' }}>-</span>
                <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={away}
                    onChange={e => setAway(e.target.value)}
                    onKeyDown={handleKeyDown} // <--- Blocks negative sign
                    inputProps={{ min: 0, style: { textAlign: 'center' } }} // <--- Min 0
                    sx={{ width: 60, bgcolor: 'white' }}
                />
            </Box>
            <Button
                // Logic: If Saved -> Success(Green). If Update -> Warning(Orange). Else -> Primary(Blue)
                color={saved ? "success" : (isUpdate ? "warning" : "primary")}
                variant={saved ? "contained" : "outlined"}
                size="small"
                onClick={save}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : (saved ? <SaveIcon /> : (isUpdate ? <EditIcon /> : null))}
                sx={{ minWidth: 120, fontSize: '0.75rem' }}
            >
                {loading ? '...' : (saved ? 'Saved' : (isUpdate ? 'Update Predict' : 'Predict'))}
            </Button>
        </Box>
    );
}