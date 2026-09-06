import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftUI Canvas — sketch SwiftUI screens in the browser",
  description:
    "Sketch SwiftUI screens in the browser, link them, tap through them, and copy a prompt for your AI coding tool.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
