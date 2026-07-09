import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trening App",
  description: "Trening bez opreme, zasnovan na igranju karata",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
