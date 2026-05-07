import "./globals.css";

export const metadata = {
  title: "Fuze Business Suite",
  description: "Business management SaaS wired to Business Suite"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
