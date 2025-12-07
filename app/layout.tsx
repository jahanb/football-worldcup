import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import AuthProvider from "@/components/AuthProvider";
import ChatBox from "@/components/ChatBox"; // <--- Import ChatBox

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Cup Predictor",
  description: "Predict matches and win!",
  icons: {
    icon: '/worldcup/medlar.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeRegistry>
            {children}
            <ChatBox /> {/* <--- Add Component Here */}
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}