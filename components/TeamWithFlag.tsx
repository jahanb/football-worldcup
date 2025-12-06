import { getFlagCode } from '@/lib/teamMapping';
import React from 'react';
import { Box, Typography } from '@mui/material';
import * as Flags from 'country-flag-icons/react/3x2';

interface Props {
    teamName: string;
    align?: 'left' | 'right';
}

export default function TeamWithFlag({ teamName, align = 'left' }: Props) {
    const code = getFlagCode(teamName);

    // 1. Try to find the flag in the library
    // @ts-ignore
    const FlagComponent = code && Flags[code as keyof typeof Flags] ? Flags[code as keyof typeof Flags] : null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
                // RESPONSIVE LAYOUT:
                // Mobile (xs): Centered, Flag-Name
                // Desktop (sm): Aligned based on prop
                flexDirection: {
                    xs: 'row',
                    sm: align === 'right' ? 'row-reverse' : 'row'
                },
                justifyContent: {
                    xs: 'center',
                    sm: align === 'right' ? 'flex-end' : 'flex-start'
                }
            }}
        >
            {/* 2. RENDER FLAG */}
            <Box
                sx={{
                    width: 24,
                    height: 16,
                    flexShrink: 0,
                    boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                    display: 'flex',
                    overflow: 'hidden',
                    bgcolor: '#eee',
                    borderRadius: 0.5
                }}
            >
                {FlagComponent ? (
                    // Use Library Flag (Brazil, France, etc.)
                    <FlagComponent title={teamName} />
                ) : code ? (
                    // Use CDN Fallback (Scotland, England, Wales)
                    // We assume the code is valid (e.g., 'GB-SCT')
                    <img
                        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
                        width="24"
                        height="16"
                        alt={teamName}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                ) : (
                    // No Code found (Placeholder)
                    <Box sx={{ width: '100%', height: '100%', bgcolor: '#ddd' }} />
                )}
            </Box>

            <Typography
                sx={{
                    fontWeight: 600,
                    fontSize: '14px',
                    lineHeight: 1.2,
                    textAlign: { xs: 'center', sm: align === 'right' ? 'right' : 'left' },
                    wordBreak: 'break-word',
                    maxWidth: { xs: '80%', sm: '100%' }
                }}
            >
                {teamName}
            </Typography>
        </Box>
    );
}