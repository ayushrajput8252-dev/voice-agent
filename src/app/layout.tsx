import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova — AI Voice Assistant",
  description:
    "A production-grade AI voice assistant powered by Gemini 2.5 Flash with multi-layer safety, tool calling, and real-time streaming responses.",
  keywords: ["AI", "voice assistant", "Gemini", "conversational AI", "speech recognition"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
