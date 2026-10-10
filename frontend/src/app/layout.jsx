import "../styles/globals.css";
import "../styles/layout.css";
import "../styles/components.css";
import "../styles/graph.css";
import Navbar from "../components/Navbar.jsx";

export const metadata = {
  title: "MindWeave — AI-Powered Personalized Learning & Understanding Platform",
  description: "Most learning platforms tell students what they got wrong. MindWeave shows them what they actually understand."
};

export default function RootLayout({ children }) {
  // Theme initialization script to execute before first render (prevents FOUC & hydration mismatch)
  const themeInitScript = `
    (function() {
      try {
        var saved = localStorage.getItem('mindweave_theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = saved || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <div className="app-container">
          <Navbar />
          <main className="main-content">{children}</main>
          <footer className="app-footer">
            <p>MindWeave &copy; {new Date().getFullYear()} &mdash; AI-Powered Conceptual Mastery & Diagnostic Platform</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
