import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ttyarcade - text-only games",
  description:
    "Text-only, monochrome arcade. Multiplayer Crazy Eights, endless procedurally generated level games, and classics like XoX.",
};

// Applies the saved theme before first paint (no flash).
const themeScript = `try{var t=localStorage.getItem('ttyarcade-theme');document.documentElement.dataset.theme=(t==='light'||t==='medium')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
