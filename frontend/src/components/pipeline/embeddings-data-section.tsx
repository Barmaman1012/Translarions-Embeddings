"use client";

import { SUPPORTED_EMBEDDING_MODELS } from "@/types/analysis";
import type { UploadReviewState } from "@/types/upload";

export type EmbeddingDocumentStatus = {
  status: "pending" | "loading" | "ready" | "error";
  embeddingDim: number | null;
  errorMessage?: string;
};

export type EmbeddingModelState = {
  modelName: string;
  numberOfSegmentsEmbedded: number;
  documentStatuses: Record<string, EmbeddingDocumentStatus>;
};

type EmbeddingsDataSectionProps = {
  review: UploadReviewState | null;
  selectedModel: string;
  onSelectedModelChange: (modelName: string) => void;
  onRunEmbeddings: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  modelStates: Record<string, EmbeddingModelState>;
};

export function EmbeddingsDataSection({
  review,
  selectedModel,
  onSelectedModelChange,
  onRunEmbeddings,
  isLoading,
  errorMessage,
  modelStates,
}: EmbeddingsDataSectionProps) {
  const persistedItems =
    review?.items.filter((item) => Boolean(item.documentId) && item.segments.length > 0) ??
    [];

  return (
    <div className="inspection-stack">
      <div className="toolbar">
        <div className="model-picker" role="tablist" aria-label="Embedding models">
          {SUPPORTED_EMBEDDING_MODELS.map((modelName) => (
            <button
              key={modelName}
              type="button"
              className={`model-chip${
                selectedModel === modelName ? " model-chip--active" : ""
              }`}
              onClick={() => onSelectedModelChange(modelName)}
            >
              {shortModelName(modelName)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="button button--primary"
          disabled={isLoading || persistedItems.length === 0}
          onClick={onRunEmbeddings}
        >
          {isLoading ? "Running embeddings..." : "Run embeddings"}
        </button>
      </div>

      {errorMessage ? (
        <div className="form-message form-message--error">{errorMessage}</div>
      ) : null}

      {!review ? (
        <EmptyPanel message="Upload texts to inspect segment embeddings." />
      ) : persistedItems.length === 0 ? (
        <EmptyPanel message="Embeddings become available after a persisted upload with stored segments." />
      ) : (
        persistedItems.map((item) => (
          <article key={item.id} className="inspection-card">
            <div className="inspection-card__header">
              <div>
                <h3>{item.label}</h3>
                <p>
                  {item.role} · {item.segmentCount} segments
                </p>
              </div>
            </div>

            <div className="embedding-doc-summary">
              {SUPPORTED_EMBEDDING_MODELS.map((modelName) => {
                const status = item.documentId
                  ? modelStates[modelName]?.documentStatuses[item.documentId]
                  : undefined;

                return (
                  <div key={modelName} className="embedding-doc-summary__item">
                    <strong>{shortModelName(modelName)}</strong>
                    <span>{formatEmbeddingStatus(status)}</span>
                    <span>{status?.embeddingDim ? `${status.embeddingDim}d` : "dim —"}</span>
                  </div>
                );
              })}
            </div>

            <div className="inspection-segment-list">
              {item.segments.map((segment) => (
                <article
                  key={`${item.id}-${segment.segment_index}`}
                  className="inspection-segment"
                >
                  <div className="inspection-segment__meta">
                    <span>#{segment.segment_index}</span>
                    <span>{segment.char_count} chars</span>
                  </div>
                  <p>{segment.text}</p>
                  <div className="segment-model-list">
                    {SUPPORTED_EMBEDDING_MODELS.map((modelName) => {
                      const status = item.documentId
                        ? modelStates[modelName]?.documentStatuses[item.documentId]
                        : undefined;

                      return (
                        <span
                          key={`${segment.segment_index}-${modelName}`}
                          className={`status-chip status-chip--${status?.status ?? "pending"}`}
                        >
                          {shortModelName(modelName)} · {formatEmbeddingStatus(status)}
                          {status?.embeddingDim ? ` · ${status.embeddingDim}d` : ""}
                        </span>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function formatEmbeddingStatus(status?: EmbeddingDocumentStatus) {
  if (!status) {
    return "pending";
  }

  if (status.status === "ready") {
    return "ready";
  }

  if (status.status === "loading") {
    return "running";
  }

  if (status.status === "error") {
    return "error";
  }

  return "pending";
}

function shortModelName(modelName: string) {
  return modelName.split("/").pop() ?? modelName;
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}

