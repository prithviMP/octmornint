import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Practice",
  description: "MCQ interview practice — placeholder UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
