import type { WorkflowStageStatus } from "@/types/project";

type StageStatusBadgeProps = {
  status: WorkflowStageStatus;
};

const statusLabelMap: Record<WorkflowStageStatus, string> = {
  not_started: "Not started",
  ready: "Ready",
  in_progress: "In progress",
  completed: "Completed",
};

export function StageStatusBadge({ status }: StageStatusBadgeProps) {
  return (
    <span className={`stage-status stage-status--${status}`}>
      {statusLabelMap[status]}
    </span>
  );
}
