import Link from "next/link";

import { StageStatusBadge } from "@/components/projects/stage-status-badge";
import type { ResearchProject, WorkflowStageKey } from "@/types/project";

type WorkflowStageNavProps = {
  project: ResearchProject;
  currentStage: WorkflowStageKey;
};

export function WorkflowStageNav({
  project,
  currentStage,
}: WorkflowStageNavProps) {
  return (
    <aside className="workflow-nav">
      <div className="workflow-nav__header">
        <span className="section-title__eyebrow">Workflow</span>
        <h2>Project stages</h2>
        <p>Track how text moves from ingestion to visualization.</p>
      </div>

      <div className="workflow-nav__list">
        {project.stages.map((stage, index) => {
          const isActive = stage.key === currentStage;

          return (
            <Link
              key={stage.key}
              href={`/projects/${project.id}?stage=${stage.key}`}
              className={`workflow-nav__item${
                isActive ? " workflow-nav__item--active" : ""
              }`}
            >
              <div className="workflow-nav__item-top">
                <span className="workflow-nav__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <StageStatusBadge status={stage.status} />
              </div>
              <h3>{stage.label}</h3>
              <p>{stage.description}</p>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
