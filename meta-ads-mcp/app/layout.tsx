import type { ReactNode } from 'react';

export const metadata = {
  title: 'Movera Meta Ads MCP',
  description: 'Private Meta Marketing API control plane for ChatGPT',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, background: '#f6f7f8', color: '#111' }}>
        {children}
      </body>
    </html>
  );
}
