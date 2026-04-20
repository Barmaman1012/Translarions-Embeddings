export type WorkflowStageKey =
  | "overview"
  | "ingestion"
  | "parsing"
  | "segments"
  | "database"
  | "embeddings"
  | "similarity"
  | "visualization";

export type WorkflowStageStatus =
  | "not_started"
  | "ready"
  | "in_progress"
  | "completed";

export type WorkflowStage = {
  key: WorkflowStageKey;
  label: string;
  description: string;
  status: WorkflowStageStatus;
};

export type ProjectCounts = {
  documents: number;
  translations: number;
  parsedDocuments: number;
  segments: number;
  embeddings: number;
  alignments: number;
};

export type ResearchProject = {
  id: string;
  title: string;
  workName: string;
  sourceDocumentTitle: string;
  sourceLanguage: string;
  translationLanguages: string[];
  workflowStatus: string;
  summary: string;
  counts: ProjectCounts;
  stages: WorkflowStage[];
};
