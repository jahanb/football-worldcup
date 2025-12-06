'use client';

import { Button } from '@mui/material';
import { signOut } from 'next-auth/react';
import LogoutIcon from '@mui/icons-material/Logout';

export default function LogoutButton() {
    return (
        <Button
            color="error"
            size="small"
            onClick={() => signOut({ callbackUrl: '/worldcup/login' })}
            sx={{ minWidth: 'auto', ml: 1 }}
            title="Logout"
        >
            <LogoutIcon />
        </Button>
    );
}