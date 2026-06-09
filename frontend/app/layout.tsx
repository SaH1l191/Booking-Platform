import type { Metadata } from "next";
import { Toaster } from "sonner";
import ClientProviders from "./components/ClientProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayEase | Holiday Rentals, Cabins, Beach Houses & More",
  description: "Find holiday rentals, cabins, beach houses, unique homes and experiences on StayEase.",
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
              border: "1px solid #ebebeb",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontFamily: "var(--font-sans)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
          }}
          closeButton
          duration={3000}
        />
      </body>
    </html>
  );
}
//npm run dev -- -p 4000