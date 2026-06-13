import "./globals.css";

export const metadata = {
  title: "DocMiracle — Chat with your documents",
  description: "Upload a document and ask questions about it using AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
