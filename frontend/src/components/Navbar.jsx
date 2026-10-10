"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/dashboard", label: "Dashboard", icon: "📖" },
    { href: "/graph", label: "Concept Graph", icon: "🕸️" },
    { href: "/quiz", label: "Diagnostic Quiz", icon: "✍️" },
    { href: "/understanding", label: "Understanding Map", icon: "🎯" },
    { href: "/revision", label: "Revision", icon: "💡" },
    { href: "/retest", label: "Retest", icon: "🔄" },
    { href: "/progress", label: "Progress", icon: "📊" }
  ];

  return (
    <header className="navbar">
      <Link href="/" className="nav-brand">
        <span className="brand-icon">🧠</span>
        <div>
          <div>MindWeave</div>
          <span className="brand-tagline">Learn. Connect. Understand.</span>
        </div>
      </Link>

      <nav aria-label="Main Navigation">
        <ul className="nav-links">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="nav-actions">
        <ThemeToggle />
      </div>
    </header>
  );
}
