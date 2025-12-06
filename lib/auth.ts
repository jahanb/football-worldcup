import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
    // 1. Hardcoded Secret (Keep this)
    secret: "KeepThisSecretKeyConsistent123456",

    // 2. FORCE HTTP (Non-Secure) COOKIES
    // This tells NextAuth to not require HTTPS
    useSecureCookies: false,

    debug: true,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                await connectDB();
                const user = await User.findOne({ username: credentials?.username });

                if (!user) throw new Error("User not found");

                const passwordsMatch = await bcrypt.compare(credentials!.password, user.password);
                if (!passwordsMatch) throw new Error("Wrong password");

                return {
                    id: user._id.toString(),
                    name: user.username,
                    email: user.isAdmin ? "admin" : "user"
                };
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/login',
    },
    // 3. Explicitly define the cookie to be non-secure
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: false, // <--- CRITICAL: Allows cookie on localhost (HTTP)
            },
        },
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).email;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.isAdmin = token.role === "admin";
            }
            return session;
        }
    }
};