import "@/app/globals.css";
import ThemeToggle from "@/app/ThemeToggle";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen transition-colors duration-200">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
