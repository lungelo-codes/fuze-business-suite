import "./globals.css";

export const metadata = {
  title: "Business Suite | Fuze Digital",
  description: "Modern business management SaaS for South African SMEs: CRM, finance, compliance, HR, projects, documents and support."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
