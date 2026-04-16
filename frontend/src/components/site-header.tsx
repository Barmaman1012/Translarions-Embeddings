"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/upload", label: "Upload" },
  { href: "/explore", label: "Explore" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <Link href="/" className="brand__title">
            Translation Embeddins Agent
          </Link>
          <span className="brand__subtitle">
            Research workspace for multilingual semantic comparison
          </span>
        </div>

        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav__link${isActive ? " nav__link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
