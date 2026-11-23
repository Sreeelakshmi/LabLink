import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabLink | Campus Laboratory Resource Sharing",
  description: "GenAI-powered campus laboratory resource-sharing and intelligent scheduling platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F7FF] text-[#25213C] antialiased">
        {children}
      </body>
    </html>
  );
}
