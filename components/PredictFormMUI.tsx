'use client';
import { useState } from 'react';
import { TextField, Button, Box, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

export default function PredictFormMUI({ matchId, initialHome, initialAway }: any) {
    const [home, setHome] = useState(initialHome ?? '');
    const [away, setAway] = useState(initialAway ?? '');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const save = async () => {
        setLoading(true);
        setSaved(false);
        await fetch('/worldcup/api/predict', {
            method: 'POST',
            body: JSON.stringify({ matchId, home: Number(home), away: Number(away) }),
        });
        setLoading(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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
                    inputProps={{ style: { textAlign: 'center' } }}
                    sx={{ width: 60, bgcolor: 'white' }}
                />
                <span style={{ fontWeight: 'bold' }}>-</span>
                <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={away}
                    onChange={e => setAway(e.target.value)}
                    inputProps={{ style: { textAlign: 'center' } }}
                    sx={{ width: 60, bgcolor: 'white' }}
                />
            </Box>
            <Button
                variant={saved ? "contained" : "outlined"}
                color={saved ? "success" : "primary"}
                size="small"
                onClick={save}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : (saved ? null : <SaveIcon />)}
                sx={{ minWidth: 100 }}
            >
                {loading ? '...' : (saved ? 'Saved' : 'Predict')}
            </Button>
        </Box>
    );
}