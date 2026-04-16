import Link from "next/link";

import { CardGrid } from "@/components/card-grid";
import { workflowCards } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="hero__eyebrow">Frontend Scaffold</span>
        <h1>Study how meaning shifts across translations.</h1>
        <p>
          This interface is a minimal starting point for uploading texts,
          comparing aligned passages, and exploring multilingual semantic
          similarity with a clean research-oriented workflow.
        </p>
        <div className="hero__actions">
          <Link href="/projects" className="button button--primary">
            View Projects
          </Link>
          <Link href="/upload" className="button button--secondary">
            Start Upload Flow
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span className="section-title__eyebrow">V1 Workflow</span>
          <h2>Core research steps</h2>
          <p>
            The current UI uses placeholder content to frame the main stages of
            the application without backend integration.
          </p>
        </div>
        <CardGrid items={workflowCards} />
      </section>
    </div>
  );
}
