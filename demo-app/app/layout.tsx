import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Testloom Demo App",
  description: "Controlled demo application for Testloom verification",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
