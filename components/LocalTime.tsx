'use client';

import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';

export default function LocalTime({ date }: { date: string | Date }) {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    // This code only runs in the browser
    const d = new Date(date);
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setFormatted(`${datePart} ${timePart}`);
  }, [date]);

  // Show nothing or a placeholder until the client-side code runs
  if (!formatted) return <Typography variant="caption" sx={{ display: 'block', height: '1.1rem' }}>...</Typography>;

  return (
    <Typography variant="caption" fontWeight="800" sx={{ fontSize: { xs: 9, sm: 12 }, display: 'block', lineHeight: 1.1 }}>
      {formatted}
    </Typography>
  );
}