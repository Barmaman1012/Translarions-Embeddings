import type {
  ResearchProject,
  WorkflowStage,
  WorkflowStageKey,
} from "@/types/project";

const stageBlueprint: Array<Pick<WorkflowStage, "key" | "label" | "description">> = [
  {
    key: "overview",
    label: "Overview",
    description: "Summarize project state, source material, and workflow readiness.",
  },
  {
    key: "ingestion",
    label: "Ingestion",
    description: "Upload or paste original and translated texts for inspection.",
  },
  {
    key: "parsing",
    label: "Parsing",
    description: "Inspect parsed file contents and confirm they match expectations.",
  },
  {
    key: "segments",
    label: "Segments",
    description: "Split texts into ordered units suitable for embedding and comparison.",
  },
  {
    key: "database",
    label: "Database",
    description: "Store documents, segments, and workflow metadata in Postgres.",
  },
  {
    key: "embeddings",
    label: "Embeddings",
    description: "Generate multilingual vector representations for each segment.",
  },
  {
    key: "similarity",
    label: "Similarity",
    description: "Compute and review semantic relationships between aligned passages.",
  },
  {
    key: "visualization",
    label: "Visualization",
    description: "Explore comparison results through research-focused views and summaries.",
  },
];

function buildStages(
  statuses: Record<WorkflowStageKey, WorkflowStage["status"]>,
): WorkflowStage[] {
  return stageBlueprint.map((stage) => ({
    ...stage,
    status: statuses[stage.key],
  }));
}

export const researchProjects: ResearchProject[] = [
  {
    id: "parallel-poetry-set",
    title: "Parallel Poetry Set",
    workName: "Parallel Poetry Set",
    sourceDocumentTitle: "Collected Poems, Base Edition",
    sourceLanguage: "English",
    translationLanguages: ["Spanish", "French", "German"],
    workflowStatus: "Parsing review in progress",
    summary:
      "A compact research set for testing how poetic tone and metaphor shift across several translations.",
    counts: {
      documents: 4,
      translations: 3,
      parsedDocuments: 2,
      segments: 0,
      embeddings: 0,
      alignments: 0,
    },
    stages: buildStages({
      overview: "completed",
      ingestion: "completed",
      parsing: "in_progress",
      segments: "ready",
      database: "not_started",
      embeddings: "not_started",
      similarity: "not_started",
      visualization: "not_started",
    }),
  },
  {
    id: "modern-essays-corpus",
    title: "Modern Essays Corpus",
    workName: "Modern Essays Corpus",
    sourceDocumentTitle: "Essais Choisis",
    sourceLanguage: "French",
    translationLanguages: ["English", "Italian"],
    workflowStatus: "Ready for ingestion",
    summary:
      "A prose-heavy corpus intended for testing paragraph-level segmentation and cross-language semantic drift.",
    counts: {
      documents: 0,
      translations: 2,
      parsedDocuments: 0,
      segments: 0,
      embeddings: 0,
      alignments: 0,
    },
    stages: buildStages({
      overview: "completed",
      ingestion: "ready",
      parsing: "not_started",
      segments: "not_started",
      database: "not_started",
      embeddings: "not_started",
      similarity: "not_started",
      visualization: "not_started",
    }),
  },
  {
    id: "historical-sermons",
    title: "Historical Sermons",
    workName: "Historical Sermons",
    sourceDocumentTitle: "Predigten, 1847 Edition",
    sourceLanguage: "German",
    translationLanguages: ["English", "Dutch", "Swedish", "Polish"],
    workflowStatus: "Embedding stage complete",
    summary:
      "A larger long-form set intended to test later retrieval, alignment, and visualization patterns.",
    counts: {
      documents: 5,
      translations: 4,
      parsedDocuments: 5,
      segments: 148,
      embeddings: 148,
      alignments: 76,
    },
    stages: buildStages({
      overview: "completed",
      ingestion: "completed",
      parsing: "completed",
      segments: "completed",
      database: "completed",
      embeddings: "completed",
      similarity: "in_progress",
      visualization: "ready",
    }),
  },
];

export const workflowCards = stageBlueprint.map((stage) => ({
  title: stage.label,
  description: stage.description,
}));

export const projectSummaries = researchProjects.map((project) => ({
  id: project.id,
  name: project.title,
  sourceLanguage: project.sourceLanguage,
  translationCount: project.counts.translations,
  status: project.workflowStatus,
}));

export const exploreMetrics = [
  {
    label: "Mock Projects",
    value: "03",
    description: "Research workspaces currently represented in the frontend workflow shell.",
  },
  {
    label: "Pipeline Stages",
    value: "08",
    description: "Named workflow stages now reflected inside each project workspace.",
  },
  {
    label: "Active Focus",
    value: "Parsing",
    description: "The current UI is strongest around ingestion review before segmentation begins.",
  },
];

export const explorationHighlights = [
  "Compare stage readiness across projects",
  "Inspect how data moves from ingestion toward similarity analysis",
  "Use the project workspace as the central path through the research pipeline",
];

export function getProjectById(id: string) {
  return researchProjects.find((project) => project.id === id);
}
