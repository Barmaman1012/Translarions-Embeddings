import { StageStatusBadge } from "@/components/projects/stage-status-badge";
import type { ResearchProject } from "@/types/project";

type ProjectOverviewStageProps = {
  project: ResearchProject;
};

export function ProjectOverviewStage({ project }: ProjectOverviewStageProps) {
  const inProgressStage = project.stages.find(
    (stage) => stage.status === "in_progress",
  );

  return (
    <div className="workspace-stage">
      <div className="section-title">
        <span className="section-title__eyebrow">Overview</span>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
      </div>

      <section className="workspace-summary-card">
        <div>
          <p className="workspace-summary-card__label">Current workflow status</p>
          <h3>{project.workflowStatus}</h3>
          <p>
            Source document: <strong>{project.sourceDocumentTitle}</strong>
          </p>
          <p>
            Source language: <strong>{project.sourceLanguage}</strong>
          </p>
          <p>
            Translation languages:{" "}
            <strong>{project.translationLanguages.join(", ")}</strong>
          </p>
        </div>

        <div className="workspace-summary-card__meta">
          <StageStatusBadge status={inProgressStage?.status ?? "ready"} />
          <span className="pill">
            Active stage: {inProgressStage?.label ?? "Ready for next step"}
          </span>
        </div>
      </section>

      <section className="section grid grid--cards">
        <article className="metric">
          <h3>Documents</h3>
          <p className="metric__value">{String(project.counts.documents).padStart(2, "0")}</p>
          <p>Original plus translated documents represented in the project.</p>
        </article>
        <article className="metric">
          <h3>Translations</h3>
          <p className="metric__value">
            {String(project.counts.translations).padStart(2, "0")}
          </p>
          <p>Translated variants currently associated with the source work.</p>
        </article>
        <article className="metric">
          <h3>Segments</h3>
          <p className="metric__value">{String(project.counts.segments).padStart(2, "0")}</p>
          <p>Ordered text units prepared for downstream embedding and comparison.</p>
        </article>
        <article className="metric">
          <h3>Embeddings</h3>
          <p className="metric__value">
            {String(project.counts.embeddings).padStart(2, "0")}
          </p>
          <p>Placeholder count for vectors that will later back similarity search.</p>
        </article>
      </section>

      <section className="section grid grid--cards">
        <article className="placeholder-panel">
          <h3>Research questions</h3>
          <ul className="placeholder-list">
            <li>How consistently does meaning survive across translation variants?</li>
            <li>Where do semantic shifts appear most strongly across the work?</li>
            <li>Which stages are ready for inspection versus still awaiting data?</li>
          </ul>
        </article>

        <article className="placeholder-panel">
          <h3>Workflow counts</h3>
          <ul className="placeholder-list">
            <li>Parsed documents: {project.counts.parsedDocuments}</li>
            <li>Stored alignments: {project.counts.alignments}</li>
            <li>Ready translation set: {project.translationLanguages.length} languages</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
