'use client';

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    // We explicitly tell NextAuth to look for API routes under /worldcup
    return (
        <SessionProvider basePath="/worldcup/api/auth">
            {children}
        </SessionProvider>
    );
}