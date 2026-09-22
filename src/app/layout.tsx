import "./globals.css";
import AppShell from "@/components/AppShell";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ToastContainer";
import { APP_ICON_ROUTE } from "@/utils/appIcon";

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Personal finance tracker for income, assets, and net worth.",
  manifest: "/site.webmanifest",
  icons: {
    icon: APP_ICON_ROUTE,
    shortcut: APP_ICON_ROUTE,
    apple: APP_ICON_ROUTE,
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
        <link rel="icon" href={APP_ICON_ROUTE} type="image/png" />
        <link rel="apple-touch-icon" href={APP_ICON_ROUTE} sizes="512x512" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
