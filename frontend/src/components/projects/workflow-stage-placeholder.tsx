import { StageStatusBadge } from "@/components/projects/stage-status-badge";
import type { WorkflowStage } from "@/types/project";

type WorkflowStagePlaceholderProps = {
  stage: WorkflowStage;
  headline: string;
  description: string;
  whatItWillDo: string[];
  futureData: string[];
};

export function WorkflowStagePlaceholder({
  stage,
  headline,
  description,
  whatItWillDo,
  futureData,
}: WorkflowStagePlaceholderProps) {
  return (
    <div className="workspace-stage">
      <div className="section-title">
        <span className="section-title__eyebrow">{stage.label}</span>
        <h2>{headline}</h2>
        <p>{description}</p>
      </div>

      <section className="workspace-summary-card">
        <div>
          <p className="workspace-summary-card__label">Stage intent</p>
          <h3>{stage.description}</h3>
        </div>
        <div className="workspace-summary-card__meta">
          <StageStatusBadge status={stage.status} />
        </div>
      </section>

      <section className="section grid grid--cards">
        <article className="placeholder-panel">
          <h3>What this stage will do</h3>
          <ul className="placeholder-list">
            {whatItWillDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="placeholder-panel">
          <h3>What this stage will show later</h3>
          <ul className="placeholder-list">
            {futureData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
