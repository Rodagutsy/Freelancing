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
    default: "Upwork Radar",
    template: "%s · Upwork Radar",
  },
  description:
    "Personal opportunity intelligence system for high-fit Upwork jobs.",
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