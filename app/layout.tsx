import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WAJBot Sessions',
  description: 'Multi-session WhatsApp dashboard built with Next.js 16 and shadcn-style UI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
