import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stoa.ai — Get AWS Certified, Faster",
  description:
    "AI-powered adaptive learning for AWS certifications. Identifies your gaps, focuses your study time, and tells you exactly when you're ready to book the exam.",
  openGraph: {
    title: "Stoa.ai",
    description: "Get AWS certified faster with AI-powered adaptive learning.",
    siteName: "Stoa.ai",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
