import { ProjectOverviewStage } from "@/components/projects/project-overview-stage";
import { WorkflowStagePlaceholder } from "@/components/projects/workflow-stage-placeholder";
import { WorkflowStageNav } from "@/components/projects/workflow-stage-nav";
import { UploadWorkspace } from "@/components/upload/upload-workspace";
import type { ResearchProject, WorkflowStageKey } from "@/types/project";

type ProjectWorkspaceProps = {
  project: ResearchProject;
  currentStage: WorkflowStageKey;
};

export function ProjectWorkspace({
  project,
  currentStage,
}: ProjectWorkspaceProps) {
  const activeStage =
    project.stages.find((stage) => stage.key === currentStage) ??
    project.stages[0];

  return (
    <div className="page page--workspace">
      <section className="workspace-hero">
        <div>
          <span className="hero__eyebrow">Project Workspace</span>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
        </div>
        <div className="workspace-hero__meta">
          <span className="pill">Source: {project.sourceLanguage}</span>
          <span className="pill">
            {project.counts.translations} translations
          </span>
          <span className="pill">Status: {project.workflowStatus}</span>
        </div>
      </section>

      <div className="workspace-layout">
        <WorkflowStageNav project={project} currentStage={activeStage.key} />

        <section className="workspace-content">
          {renderStage(project, activeStage.key)}
        </section>
      </div>
    </div>
  );
}

function renderStage(project: ResearchProject, stage: WorkflowStageKey) {
  const currentStage = project.stages.find((item) => item.key === stage) ?? project.stages[0];

  switch (stage) {
    case "overview":
      return <ProjectOverviewStage project={project} />;
    case "ingestion":
      return (
        <UploadWorkspace
          embedded
          heading="Ingestion"
          description="Bring source and translated texts into the project, inspect parsed results, and confirm the material is ready for segmentation."
          note="Use file mode for the real backend parsing flow. Paste mode remains a local preview path for manual testing."
        />
      );
    case "parsing":
      return (
        <WorkflowStagePlaceholder
          stage={currentStage}
          headline="Parsing review and document checks"
          description="This stage will validate that uploaded material was decoded and structured correctly before segmentation begins."
          whatItWillDo={[
            "Compare file-level parse previews against expected source and translation texts.",
            "Flag malformed uploads, missing language labels, or suspiciously short content.",
            "Promote reviewed parsed documents into the segmentation queue.",
          ]}
          futureData={[
            "Parsed document previews and file provenance.",
            "Validation warnings and manual review notes.",
            "Per-document parse status and readiness markers.",
          ]}
        />
      );
    case "segments":
      return (
        <WorkflowStagePlaceholder
          stage={currentStage}
          headline="Segment generation and passage inspection"
          description="This stage will turn reviewed documents into ordered comparison units suitable for embeddings and alignment work."
          whatItWillDo={[
            "Run paragraph-first segmentation with sentence fallback for long passages.",
            "Preserve per-document segment order and normalized text.",
            "Let researchers inspect chunk size and segmentation quality before persistence.",
          ]}
          futureData={[
            "Ordered segment lists with indices, normalized text, and length metrics.",
            "Segmentation settings used for each document.",
            "Review tools for oversize or undersized chunks.",
          ]}
        />
      );
    case "database":
      return (
        <WorkflowStagePlaceholder
          stage={currentStage}
          headline="Database persistence and record tracing"
          description="This stage will show what has been persisted to Postgres and what is still only in transient review state."
          whatItWillDo={[
            "Create document and segment records in the Supabase Postgres schema.",
            "Track which parsed and segmented artifacts have stable database IDs.",
            "Expose persistence boundaries before embeddings and similarity analysis run.",
          ]}
          futureData={[
            "Document, segment, and alignment record counts.",
            "Persistence timestamps and database status markers.",
            "Data integrity checks across original and translation records.",
          ]}
        />
      );
    case "embeddings":
      return (
        <WorkflowStagePlaceholder
          stage={currentStage}
          headline="Embedding generation pipeline"
          description="This stage will manage vector creation for segmented texts and make the model choice explicit."
          whatItWillDo={[
            "Generate multilingual sentence-transformer embeddings per segment.",
            "Track model name, queue state, and completion counts.",
            "Prepare vectors for later pgvector similarity search.",
          ]}
          futureData={[
            "Embedding job status and model configuration.",
            "Counts of embedded versus pending segments.",
            "Diagnostics for failed or incomplete vector generation.",
          ]}
        />
      );
    case "similarity":
      return (
        <WorkflowStagePlaceholder
          stage={currentStage}
          headline="Similarity analysis and alignment review"
          description="This stage will surface passage-to-passage comparisons once vectors and alignments are available."
          whatItWillDo={[
            "Compare source and translation segment vectors.",
            "Support alignment scoring and candidate matching review.",
            "Highlight where semantic distance appears strongest across translations.",
          ]}
          futureData={[
            "Alignment candidate lists and similarity scores.",
            "Nearest-neighbor comparisons by segment.",
            "Flags for ambiguous or low-confidence matches.",
          ]}
        />
      );
    case "visualization":
      return (
        <WorkflowStagePlaceholder
          stage={currentStage}
          headline="Visualization and interpretation"
          description="This stage will turn the analysis output into a coherent research surface for browsing and interpretation."
          whatItWillDo={[
            "Render translation distance views and passage-level comparison panels.",
            "Support exploration across languages, stages, and works.",
            "Help researchers move from raw scores to interpretable patterns.",
          ]}
          futureData={[
            "Charts, matrices, and passage comparison views.",
            "Filters by document, language, and alignment strategy.",
            "Saved interpretation notes and research summaries.",
          ]}
        />
      );
    default:
      return <ProjectOverviewStage project={project} />;
  }
}
