// src/app/layout.js
import "./globals.css";
import { Providers } from "./providers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
      <html lang="en">
      <body>
      <Providers session={session}>{children}</Providers>
      </body>
      </html>
  );
}
