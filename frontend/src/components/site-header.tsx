"use client";

import Link from "next/link";

export function SiteHeader() {
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
        <nav className="nav nav--minimal" aria-label="Primary">
          <a href="#upload" className="nav__link">
            Upload
          </a>
          <a href="#parsed" className="nav__link">
            Parse
          </a>
          <a href="#segments" className="nav__link">
            Segments
          </a>
          <a href="#embeddings" className="nav__link">
            Embeddings
          </a>
          <a href="#similarity" className="nav__link">
            Similarity
          </a>
          <a href="#visualization" className="nav__link">
            Visualization
          </a>
        </nav>
      </div>
    </header>
  );
}
