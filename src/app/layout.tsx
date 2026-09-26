import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "@/styles/tokens.css";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Freelance-Moncha",
    template: "%s · Freelance-Moncha",
  },
  description:
    "Freelance-Moncha is a personal job-search intelligence dashboard for finding and acting on high-fit Upwork opportunities.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={lato.variable}>
      <body>{children}</body>
    </html>
  );
}