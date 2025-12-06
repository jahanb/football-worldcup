import { getFlagCode } from '@/lib/teamMapping';
import React from 'react';

// Dynamically import the flag component to avoid errors if code is missing
// We use a simple img tag pointing to the library's CDN or SVG path
// But country-flag-icons provides React components directly.

import * as Flags from 'country-flag-icons/react/3x2';

export default function TeamWithFlag({ teamName, align = 'left' }: { teamName: string, align?: 'left' | 'right' }) {
    const code = getFlagCode(teamName);
    // @ts-ignore - The library types can be tricky with dynamic keys
    const FlagComponent = code && Flags[code as keyof typeof Flags] ? Flags[code as keyof typeof Flags] : null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
            flexDirection: align === 'right' ? 'row-reverse' : 'row'
        }}>
            {FlagComponent ? (
                <div style={{ width: 24, height: 16, flexShrink: 0, boxShadow: '0 0 2px rgba(0,0,0,0.3)' }}>
                    <FlagComponent title={teamName} />
                </div>
            ) : (
                // Placeholder gray box for teams with no flag
                <div style={{ width: 24, height: 16, background: '#eee', borderRadius: 2 }} />
            )}
            <span style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.2 }}>{teamName}</span>
        </div>
    );
}