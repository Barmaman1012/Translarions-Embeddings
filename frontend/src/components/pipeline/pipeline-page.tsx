"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { EmbeddingsDataSection } from "@/components/pipeline/embeddings-data-section";
import type {
  EmbeddingDocumentStatus,
  EmbeddingModelState,
} from "@/components/pipeline/embeddings-data-section";
import { SegmentationPreviewSection } from "@/components/pipeline/segmentation-preview-section";
import { SimilaritySummarySection } from "@/components/pipeline/similarity-summary-section";
import { VisualizationSection } from "@/components/pipeline/visualization-section";
import { UploadWorkspace } from "@/components/upload/upload-workspace";
import { runEmbeddings } from "@/lib/api/embed";
import { runSimilarityAnalysis } from "@/lib/api/similarity";
import { fetchVisualizationData } from "@/lib/api/visualization";
import {
  SUPPORTED_EMBEDDING_MODELS,
  type SimilarityResponse,
  type VisualizationResponse,
} from "@/types/analysis";
import type { UploadReviewState } from "@/types/upload";

const pipelineStages = [
  "Upload",
  "Parse",
  "Segment",
  "Store",
  "Embed",
  "Compare",
  "Visualize",
];

const fallbackData = {
  items: [
    { label: "Original", role: "original", length: 1840 },
    { label: "Translation A", role: "translation", length: 1724 },
    { label: "Translation B", role: "translation", length: 1691 },
  ],
  notes: ["Upload a source text and translations to replace this preview."],
};

export function PipelinePage() {
  const [review, setReview] = useState<UploadReviewState | null>(null);
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<string>(
    SUPPORTED_EMBEDDING_MODELS[0],
  );
  const [embeddingModelStates, setEmbeddingModelStates] = useState<
    Record<string, EmbeddingModelState>
  >({});
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [selectedSimilarityModel, setSelectedSimilarityModel] =
    useState<string>(SUPPORTED_EMBEDDING_MODELS[0]);
  const [similarityError, setSimilarityError] = useState<string | null>(null);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityResult, setSimilarityResult] =
    useState<SimilarityResponse | null>(null);
  const [selectedVisualizationModel, setSelectedVisualizationModel] =
    useState<string>(SUPPORTED_EMBEDDING_MODELS[0]);
  const [selectedVisualizationView, setSelectedVisualizationView] =
    useState<"2d" | "3d">("2d");
  const [visualizationScope, setVisualizationScope] = useState<
    "all" | "source" | "translations"
  >("all");
  const [selectedVisualizationDocumentIds, setSelectedVisualizationDocumentIds] =
    useState<string[]>([]);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [visualizationLoading, setVisualizationLoading] = useState(false);
  const [visualizationResult, setVisualizationResult] =
    useState<VisualizationResponse | null>(null);

  const items = useMemo(() => {
    if (!review) {
      return fallbackData.items;
    }

    return review.items.map((item) => ({
      label: item.label,
      role: item.role,
      length: item.contentLength,
      preview: item.preview,
    }));
  }, [review]);
  const persistedItems = useMemo(
    () =>
      review?.items.filter((item) => Boolean(item.documentId) && item.segments.length > 0) ??
      [],
    [review],
  );
  const [sourceDocumentId, setSourceDocumentId] = useState("");
  const [targetDocumentIds, setTargetDocumentIds] = useState<string[]>([]);

  useEffect(() => {
    setEmbeddingModelStates({});
    setEmbeddingError(null);
    setSimilarityError(null);
    setSimilarityResult(null);
    setVisualizationError(null);
    setVisualizationResult(null);

    if (persistedItems.length === 0) {
      setSourceDocumentId("");
      setTargetDocumentIds([]);
      setSelectedVisualizationDocumentIds([]);
      return;
    }

    const nextSource = persistedItems[0].documentId ?? "";
    const nextTargets = persistedItems
      .slice(1)
      .map((item) => item.documentId)
      .filter((value): value is string => Boolean(value));
    setSourceDocumentId(nextSource);
    setTargetDocumentIds(nextTargets);
    setSelectedVisualizationDocumentIds(
      persistedItems
        .map((item) => item.documentId)
        .filter((value): value is string => Boolean(value)),
    );
  }, [review, persistedItems]);

  const currentStage = visualizationResult
    ? "Visualize"
    : similarityResult
      ? "Compare"
    : hasReadyEmbeddings(embeddingModelStates)
      ? "Embed"
      : review && persistedItems.length > 0
        ? "Segment"
        : review
          ? "Parse"
          : "Upload";

  const maxLength = Math.max(...items.map((item) => item.length), 1);
  const totalChars = items.reduce((sum, item) => sum + item.length, 0);
  const translationCount = items.filter((item) => item.role === "translation").length;
  const avgLength = items.length > 0 ? Math.round(totalChars / items.length) : 0;

  async function handleRunEmbeddings() {
    const currentDocumentIds = persistedItems
      .map((item) => item.documentId)
      .filter((value): value is string => Boolean(value));

    if (currentDocumentIds.length === 0) {
      setEmbeddingError("Upload persisted documents before running embeddings.");
      return;
    }

    setEmbeddingLoading(true);
    setEmbeddingError(null);
    setEmbeddingModelStates((current) => ({
      ...current,
      [selectedEmbeddingModel]: {
        modelName: selectedEmbeddingModel,
        numberOfSegmentsEmbedded:
          current[selectedEmbeddingModel]?.numberOfSegmentsEmbedded ?? 0,
        documentStatuses: buildDocumentStatuses(
          currentDocumentIds,
          "loading",
          current[selectedEmbeddingModel]?.documentStatuses,
        ),
      },
    }));

    try {
      const response = await runEmbeddings({
        modelName: selectedEmbeddingModel,
        reembed: false,
      });
      const responseDocIds =
        response.affected_document_ids.length > 0
          ? response.affected_document_ids
          : currentDocumentIds;

      setEmbeddingModelStates((current) => ({
        ...current,
        [selectedEmbeddingModel]: {
          modelName: selectedEmbeddingModel,
          numberOfSegmentsEmbedded: response.number_of_segments_embedded,
          documentStatuses: buildDocumentStatuses(
            responseDocIds,
            "ready",
            current[selectedEmbeddingModel]?.documentStatuses,
            response.embedding_dim,
          ),
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Embedding request failed.";
      setEmbeddingError(message);
      setEmbeddingModelStates((current) => ({
        ...current,
        [selectedEmbeddingModel]: {
          modelName: selectedEmbeddingModel,
          numberOfSegmentsEmbedded:
            current[selectedEmbeddingModel]?.numberOfSegmentsEmbedded ?? 0,
          documentStatuses: buildDocumentStatuses(
            currentDocumentIds,
            "error",
            current[selectedEmbeddingModel]?.documentStatuses,
            null,
            message,
          ),
        },
      }));
    } finally {
      setEmbeddingLoading(false);
    }
  }

  async function handleRunSimilarity() {
    if (!sourceDocumentId || targetDocumentIds.length === 0) {
      setSimilarityError("Choose one source document and at least one target.");
      return;
    }

    setSimilarityLoading(true);
    setSimilarityError(null);

    try {
      const response = await runSimilarityAnalysis({
        modelName: selectedSimilarityModel,
        sourceDocumentId,
        targetDocumentIds,
      });
      setSimilarityResult(response);
    } catch (error) {
      setSimilarityResult(null);
      setSimilarityError(
        error instanceof Error ? error.message : "Similarity request failed.",
      );
    } finally {
      setSimilarityLoading(false);
    }
  }

  function handleTargetDocumentToggle(documentId: string) {
    setSimilarityResult(null);
    setTargetDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((value) => value !== documentId)
        : [...current, documentId],
    );
  }

  function handleVisualizationScopeChange(scope: "all" | "source" | "translations") {
    setVisualizationScope(scope);
    setVisualizationResult(null);
    const nextDocumentIds = persistedItems
      .filter((item) => {
        if (!item.documentId) {
          return false;
        }
        if (scope === "source") {
          return item.role === "original";
        }
        if (scope === "translations") {
          return item.role === "translation";
        }
        return true;
      })
      .map((item) => item.documentId)
      .filter((value): value is string => Boolean(value));
    setSelectedVisualizationDocumentIds(nextDocumentIds);
  }

  function handleVisualizationDocumentToggle(documentId: string) {
    setVisualizationResult(null);
    setSelectedVisualizationDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((value) => value !== documentId)
        : [...current, documentId],
    );
  }

  async function handleLoadVisualization() {
    if (selectedVisualizationDocumentIds.length === 0) {
      setVisualizationError("Choose at least one document for visualization.");
      return;
    }

    setVisualizationLoading(true);
    setVisualizationError(null);

    try {
      const response = await fetchVisualizationData({
        modelName: selectedVisualizationModel,
        documentIds: selectedVisualizationDocumentIds,
        projectionMethod: "pca",
        projectionDimensions: selectedVisualizationView === "3d" ? 3 : 2,
      });
      setVisualizationResult(response);
    } catch (error) {
      setVisualizationResult(null);
      setVisualizationError(
        error instanceof Error ? error.message : "Visualization request failed.",
      );
    } finally {
      setVisualizationLoading(false);
    }
  }

  return (
    <div className="page pipeline-page">
      <section className="pipeline-hero">
        <div>
          <h1>Compare translations</h1>
          <p>Upload texts, segment passages, and analyze similarity.</p>
        </div>
      </section>

      <section className="stage-strip" aria-label="Workflow stages">
        {pipelineStages.map((stage, index) => (
          <div
            key={stage}
            className={`stage-strip__item${
              stage === currentStage ? " stage-strip__item--active" : ""
            }`}
          >
            <span>{stage}</span>
            {index < pipelineStages.length - 1 ? (
              <span className="stage-strip__divider" aria-hidden="true">
                →
              </span>
            ) : null}
          </div>
        ))}
      </section>

      <PipelineSection
        id="upload"
        title="Upload"
        description="Source plus one or more translations."
      >
        <UploadWorkspace
          embedded
          showReview={false}
          onReviewChange={setReview}
          heading="Upload"
          description="Send files to the backend or use local paste mode."
          note="Start with text ingestion."
        />
      </PipelineSection>

      <PipelineSection
        id="parsed"
        title="Parsed output"
        description="Structured preview before segmentation."
      >
        <div className="pipeline-grid">
          <div className="db-preview">
            <div className="db-preview__header">
              <span>documents</span>
              <span>{items.length} rows</span>
            </div>
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th>role</th>
                  <th>label</th>
                  <th>lang</th>
                  <th>chars</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.label}>
                    <td>{item.role}</td>
                    <td>{item.label}</td>
                    <td>
                      {review?.items.find((entry) => entry.label === item.label)?.language ??
                        "—"}
                    </td>
                    <td>{item.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="preview-stack">
            {items.slice(0, 3).map((item) => (
              <article key={item.label} className="preview-snippet">
                <div className="preview-snippet__top">
                  <strong>{item.label}</strong>
                  <span>{item.role}</span>
                </div>
                <p>
                  {"preview" in item && item.preview
                    ? item.preview
                    : "Parsed text preview will appear here after upload."}
                </p>
              </article>
            ))}
          </div>
        </div>
      </PipelineSection>

      <PipelineSection
        id="charts"
        title="Charts"
        description="Quick input summary."
      >
        <div className="summary-strip">
          <div className="summary-stat">
            <span>Total chars</span>
            <strong>{totalChars.toLocaleString()}</strong>
          </div>
          <div className="summary-stat">
            <span>Translations</span>
            <strong>{translationCount}</strong>
          </div>
          <div className="summary-stat">
            <span>Avg length</span>
            <strong>{avgLength}</strong>
          </div>
        </div>

        <div className="length-bars">
          {items.map((item) => (
            <div key={item.label} className="length-bars__row">
              <span>{item.label}</span>
              <div className="length-bars__track">
                <div
                  className={`length-bars__fill length-bars__fill--${item.role}`}
                  style={{ width: `${(item.length / maxLength) * 100}%` }}
                />
              </div>
              <strong>{item.length}</strong>
            </div>
          ))}
        </div>
      </PipelineSection>

      <PipelineSection
        id="segments"
        title="Segmentation Preview"
        description="Ordered stored segments for each document."
      >
        <SegmentationPreviewSection review={review} />
      </PipelineSection>

      <PipelineSection
        id="embeddings"
        title="Embeddings Data"
        description="Model coverage and embedding status by segment."
      >
        <EmbeddingsDataSection
          review={review}
          selectedModel={selectedEmbeddingModel}
          onSelectedModelChange={setSelectedEmbeddingModel}
          onRunEmbeddings={handleRunEmbeddings}
          isLoading={embeddingLoading}
          errorMessage={embeddingError}
          modelStates={embeddingModelStates}
        />
      </PipelineSection>

      <PipelineSection
        id="similarity"
        title="Similarity Summary"
        description="Inline comparison of source and translation segments."
      >
        <SimilaritySummarySection
          review={review}
          selectedModel={selectedSimilarityModel}
          sourceDocumentId={sourceDocumentId}
          targetDocumentIds={targetDocumentIds}
          onSelectedModelChange={(modelName) => {
            setSelectedSimilarityModel(modelName);
            setSimilarityResult(null);
          }}
          onSourceDocumentChange={(documentId) => {
            setSourceDocumentId(documentId);
            setTargetDocumentIds((current) =>
              current.filter((value) => value !== documentId),
            );
            setSimilarityResult(null);
          }}
          onTargetDocumentToggle={handleTargetDocumentToggle}
          onRunSimilarity={handleRunSimilarity}
          isLoading={similarityLoading}
          errorMessage={similarityError}
          result={similarityResult}
        />
      </PipelineSection>

      <PipelineSection
        id="visualization"
        title="Visualization"
        description="2D projection of selected segment embeddings."
      >
        <VisualizationSection
          review={review}
          selectedModel={selectedVisualizationModel}
          onSelectedModelChange={(modelName) => {
            setSelectedVisualizationModel(modelName);
            setVisualizationResult(null);
          }}
          documentScope={visualizationScope}
          onDocumentScopeChange={handleVisualizationScopeChange}
          selectedDocumentIds={selectedVisualizationDocumentIds}
          onDocumentToggle={handleVisualizationDocumentToggle}
          selectedView={selectedVisualizationView}
          onSelectedViewChange={(view) => {
            setSelectedVisualizationView(view);
            setVisualizationResult(null);
          }}
          onLoadVisualization={handleLoadVisualization}
          isLoading={visualizationLoading}
          errorMessage={visualizationError}
          result={visualizationResult}
        />
      </PipelineSection>
    </div>
  );
}

function buildDocumentStatuses(
  documentIds: string[],
  status: EmbeddingDocumentStatus["status"],
  existingStatuses?: Record<string, EmbeddingDocumentStatus>,
  embeddingDim: number | null = null,
  errorMessage?: string,
) {
  const nextStatuses = { ...(existingStatuses ?? {}) };

  documentIds.forEach((documentId) => {
    nextStatuses[documentId] = {
      status,
      embeddingDim:
        embeddingDim ?? existingStatuses?.[documentId]?.embeddingDim ?? null,
      errorMessage,
    };
  });

  return nextStatuses;
}

function hasReadyEmbeddings(modelStates: Record<string, EmbeddingModelState>) {
  return Object.values(modelStates).some((modelState) =>
    Object.values(modelState.documentStatuses).some(
      (documentStatus) => documentStatus.status === "ready",
    ),
  );
}

type PipelineSectionProps = {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
};

function PipelineSection({
  id,
  title,
  description,
  children,
}: PipelineSectionProps) {
  return (
    <section id={id} className="pipeline-panel">
      <div className="pipeline-panel__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="pipeline-panel__body">{children}</div>
    </section>
  );
}
