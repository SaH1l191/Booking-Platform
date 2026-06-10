import type { Metadata } from "next";
import { Toaster } from "sonner";
import ClientProviders from "./components/ClientProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haven | Luxury Hotel & Stay Bookings",
  description: "Discover extraordinary stays, boutique hotels, and curated experiences around the world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              border: "1px solid #e2e0dc",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontFamily: "var(--font-sans)",
              boxShadow: "0 12px 40px -8px rgba(15,23,42,0.12)",
            },
          }}
          closeButton
          duration={3000}
        />
      </body>
    </html>
  );
}
