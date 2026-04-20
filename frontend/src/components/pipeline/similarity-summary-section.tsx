"use client";

import { SUPPORTED_EMBEDDING_MODELS } from "@/types/analysis";
import type {
  SimilarityResponse,
  TargetDocumentSimilarity,
} from "@/types/analysis";
import type { UploadReviewState } from "@/types/upload";

type SimilaritySummarySectionProps = {
  review: UploadReviewState | null;
  selectedModel: string;
  sourceDocumentId: string;
  targetDocumentIds: string[];
  onSelectedModelChange: (modelName: string) => void;
  onSourceDocumentChange: (documentId: string) => void;
  onTargetDocumentToggle: (documentId: string) => void;
  onRunSimilarity: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  result: SimilarityResponse | null;
};

export function SimilaritySummarySection({
  review,
  selectedModel,
  sourceDocumentId,
  targetDocumentIds,
  onSelectedModelChange,
  onSourceDocumentChange,
  onTargetDocumentToggle,
  onRunSimilarity,
  isLoading,
  errorMessage,
  result,
}: SimilaritySummarySectionProps) {
  const persistedItems =
    review?.items.filter((item) => Boolean(item.documentId) && item.segments.length > 0) ??
    [];

  return (
    <div className="inspection-stack">
      <div className="similarity-controls">
        <label className="field">
          <span className="field__label">Model</span>
          <select
            value={selectedModel}
            onChange={(event) => onSelectedModelChange(event.target.value)}
          >
            {SUPPORTED_EMBEDDING_MODELS.map((modelName) => (
              <option key={modelName} value={modelName}>
                {modelName}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Source</span>
          <select
            value={sourceDocumentId}
            onChange={(event) => onSourceDocumentChange(event.target.value)}
            disabled={persistedItems.length === 0}
          >
            {persistedItems.map((item) => (
              <option key={item.documentId} value={item.documentId}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field__label">Targets</span>
          <div className="target-picker">
            {persistedItems
              .filter((item) => item.documentId !== sourceDocumentId)
              .map((item) => (
                <label key={item.documentId} className="target-pill">
                  <input
                    type="checkbox"
                    checked={targetDocumentIds.includes(item.documentId ?? "")}
                    onChange={() => onTargetDocumentToggle(item.documentId ?? "")}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="similarity-actions">
          <button
            type="button"
            className="button button--primary"
            disabled={
              isLoading ||
              !sourceDocumentId ||
              targetDocumentIds.length === 0 ||
              persistedItems.length === 0
            }
            onClick={onRunSimilarity}
          >
            {isLoading ? "Running comparison..." : "Run similarity"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="form-message form-message--error">{errorMessage}</div>
      ) : null}

      {!review ? (
        <EmptyPanel message="Upload texts to compare persisted segments." />
      ) : persistedItems.length < 2 ? (
        <EmptyPanel message="Similarity needs one persisted source document and at least one persisted target document." />
      ) : !result ? (
        <EmptyPanel message="Select a model, choose source and targets, then run similarity." />
      ) : (
        <div className="inspection-stack">
          {result.targets.map((target) => {
            const targetLabel = getDocumentLabel(review, target.target_document_id);

            return (
              <article
                key={target.target_document_id}
                className="inspection-card"
              >
                <div className="inspection-card__header">
                  <div>
                    <h3>{targetLabel}</h3>
                    <p>
                      {target.compared_segments_count} compared · average{" "}
                      {formatSimilarity(target.average_similarity)}
                    </p>
                  </div>
                  <div className="inspection-card__meta">
                    <span
                      className={`status-chip status-chip--${getSimilarityLevel(
                        target.average_similarity,
                      )}`}
                    >
                      {similarityLevelLabel(target)}
                    </span>
                  </div>
                </div>

                <SimilarityPairsTable target={target} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SimilarityPairsTable({
  target,
}: {
  target: TargetDocumentSimilarity;
}) {
  if (target.segment_pairs.length === 0) {
    return <EmptyPanel message="No aligned segment pairs were available for this target." compact />;
  }

  return (
    <div className="pairs-table-wrap">
      <table className="pipeline-table">
        <thead>
          <tr>
            <th>idx</th>
            <th>source</th>
            <th>target</th>
            <th>score</th>
          </tr>
        </thead>
        <tbody>
          {target.segment_pairs.map((pair) => (
            <tr key={`${target.target_document_id}-${pair.segment_index}`}>
              <td>{pair.segment_index}</td>
              <td>{pair.source_text}</td>
              <td>{pair.target_text}</td>
              <td>
                <span
                  className={`status-chip status-chip--${getSimilarityLevel(
                    pair.similarity_score,
                  )}`}
                >
                  {pair.similarity_score.toFixed(3)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getDocumentLabel(review: UploadReviewState, documentId: string) {
  return (
    review.items.find((item) => item.documentId === documentId)?.label ?? documentId
  );
}

function getSimilarityLevel(score: number | null) {
  if (score === null) {
    return "pending";
  }

  if (score >= 0.85) {
    return "high";
  }

  if (score >= 0.65) {
    return "medium";
  }

  return "low";
}

function similarityLevelLabel(target: TargetDocumentSimilarity) {
  if (target.average_similarity === null) {
    return "no matches";
  }

  return `${getSimilarityLevel(target.average_similarity)} similarity`;
}

function formatSimilarity(score: number | null) {
  return score === null ? "—" : score.toFixed(3);
}

function EmptyPanel({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state${compact ? " empty-state--compact" : ""}`}>
      <p>{message}</p>
    </div>
  );
}

