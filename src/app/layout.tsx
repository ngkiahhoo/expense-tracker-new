import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Personal finance tracker for income, assets, and net worth.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
