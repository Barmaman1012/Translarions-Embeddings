"use client";

import { useMemo, useState } from "react";

import { SUPPORTED_EMBEDDING_MODELS } from "@/types/analysis";
import type { VisualizationPoint, VisualizationResponse } from "@/types/analysis";
import type { UploadReviewState } from "@/types/upload";

type DocumentScope = "all" | "source" | "translations";

type VisualizationSectionProps = {
  review: UploadReviewState | null;
  selectedModel: string;
  onSelectedModelChange: (modelName: string) => void;
  documentScope: DocumentScope;
  onDocumentScopeChange: (scope: DocumentScope) => void;
  selectedDocumentIds: string[];
  onDocumentToggle: (documentId: string) => void;
  onLoadVisualization: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  result: VisualizationResponse | null;
};

const DOCUMENT_COLORS = [
  "#315efb",
  "#1f7a6b",
  "#7a5cff",
  "#b15d2f",
  "#2573a6",
  "#7b8a2a",
];

export function VisualizationSection({
  review,
  selectedModel,
  onSelectedModelChange,
  documentScope,
  onDocumentScopeChange,
  selectedDocumentIds,
  onDocumentToggle,
  onLoadVisualization,
  isLoading,
  errorMessage,
  result,
}: VisualizationSectionProps) {
  const persistedItems =
    review?.items.filter((item) => Boolean(item.documentId) && item.segments.length > 0) ??
    [];
  const visibleItems = persistedItems.filter((item) => {
    if (documentScope === "source") {
      return item.role === "original";
    }
    if (documentScope === "translations") {
      return item.role === "translation";
    }
    return true;
  });
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [showCoordinatesTable, setShowCoordinatesTable] = useState(false);
  const [useJitter, setUseJitter] = useState(true);

  const activePoint = useMemo(() => {
    if (!result?.points.length) {
      return null;
    }

    return (
      result.points.find((point) => point.segment_id === activePointId) ??
      result.points[0]
    );
  }, [activePointId, result]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    persistedItems.forEach((item, index) => {
      if (item.documentId) {
        map[item.documentId] = DOCUMENT_COLORS[index % DOCUMENT_COLORS.length];
      }
    });
    return map;
  }, [persistedItems]);

  const plottedPoints = useMemo(
    () => normalizePointsForPlot(result?.points ?? [], useJitter),
    [result, useJitter],
  );

  return (
    <div className="inspection-stack">
      <div className="visualization-toolbar">
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

        <div className="field">
          <span className="field__label">Scope</span>
          <div className="model-picker" role="tablist" aria-label="Document scope">
            {(["all", "source", "translations"] as DocumentScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                className={`model-chip${
                  documentScope === scope ? " model-chip--active" : ""
                }`}
                onClick={() => onDocumentScopeChange(scope)}
              >
                {scope === "source"
                  ? "Source"
                  : scope === "translations"
                    ? "Translations"
                    : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Documents</span>
          <div className="target-picker">
            {visibleItems.map((item) => (
              <label key={item.documentId ?? item.id} className="target-pill">
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(item.documentId ?? "")}
                  onChange={() => onDocumentToggle(item.documentId ?? "")}
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
            disabled={isLoading || selectedDocumentIds.length === 0}
            onClick={onLoadVisualization}
          >
            {isLoading ? "Projecting..." : "Load visualization"}
          </button>
        </div>

        <div className="viz-display-controls">
          <label className="target-pill">
            <input
              type="checkbox"
              checked={useJitter}
              onChange={(event) => setUseJitter(event.target.checked)}
            />
            <span>Display jitter</span>
          </label>
          <label className="target-pill">
            <input
              type="checkbox"
              checked={showCoordinatesTable}
              onChange={(event) => setShowCoordinatesTable(event.target.checked)}
            />
            <span>Coordinates table</span>
          </label>
        </div>
      </div>

      {errorMessage ? (
        <div className="form-message form-message--error">{errorMessage}</div>
      ) : null}

      {!review ? (
        <EmptyPanel message="Upload and embed documents before opening visualization." />
      ) : persistedItems.length === 0 ? (
        <EmptyPanel message="Visualization needs persisted documents with stored segments." />
      ) : !result ? (
        <EmptyPanel message="Choose a model and documents, then project the selected embeddings." />
      ) : result.point_count === 0 ? (
        <EmptyPanel message="No embedding points were returned for this model and document set." />
      ) : (
        <>
          <div className="visualization-layout">
            <div className="viz-surface">
              <div className="viz-surface__meta">
                <span className="pill">
                  {result.projection_method.toUpperCase()}
                </span>
                <span className="pill">{result.point_count} points</span>
                <span className="pill">
                  x {formatDomain(plottedPoints, "x")}
                </span>
                <span className="pill">
                  y {formatDomain(plottedPoints, "y")}
                </span>
              </div>

              {activePoint ? (
                <div className="viz-hover-card">
                  <strong>{activePoint.document_label}</strong>
                  <span>{activePoint.role}</span>
                  <span>#{activePoint.segment_index}</span>
                  <span>
                    x {activePoint.x.toFixed(4)} · y {activePoint.y.toFixed(4)}
                  </span>
                </div>
              ) : null}

              <svg
                viewBox="0 0 100 100"
                className="viz-plot"
                role="img"
                aria-label="2D embedding projection"
              >
                <rect x="0" y="0" width="100" height="100" rx="6" className="viz-plot__bg" />
                <line x1="8" y1="50" x2="92" y2="50" className="viz-plot__axis" />
                <line x1="50" y1="8" x2="50" y2="92" className="viz-plot__axis" />

                {plottedPoints.map((point) => {
                  const isActive = activePoint?.segment_id === point.segment_id;
                  const color = colorMap[point.document_id] ?? "#315efb";
                  return (
                    <g
                      key={point.segment_id}
                      onMouseEnter={() => setActivePointId(point.segment_id)}
                      onClick={() => setActivePointId(point.segment_id)}
                    >
                      {point.role === "original" ? (
                        <circle
                          cx={point.plotX}
                          cy={point.plotY}
                          r={isActive ? 2.15 : 1.55}
                          fill={color}
                          fillOpacity={isActive ? 0.92 : 0.72}
                          stroke={isActive ? "#0f1728" : "rgba(15, 23, 40, 0.24)"}
                          strokeWidth={isActive ? 0.42 : 0.26}
                          className="viz-plot__point"
                        />
                      ) : (
                        <rect
                          x={point.plotX - (isActive ? 2.0 : 1.45)}
                          y={point.plotY - (isActive ? 2.0 : 1.45)}
                          width={isActive ? 4.0 : 2.9}
                          height={isActive ? 4.0 : 2.9}
                          rx="0.55"
                          fill={color}
                          fillOpacity={isActive ? 0.9 : 0.68}
                          stroke={isActive ? "#0f1728" : "rgba(15, 23, 40, 0.24)"}
                          strokeWidth={isActive ? 0.38 : 0.22}
                          className="viz-plot__point"
                        />
                      )}

                      {isActive ? (
                        <text
                          x={point.plotX + 1.4}
                          y={point.plotY - 1.1}
                          className="viz-plot__label"
                        >
                          #{point.segment_index}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              <div className="viz-legend">
                {visibleItems
                  .filter((item) => item.documentId && selectedDocumentIds.includes(item.documentId))
                  .map((item) => (
                    <div key={item.documentId ?? item.id} className="viz-legend__item">
                      <span
                        className="viz-legend__swatch"
                        style={{ backgroundColor: colorMap[item.documentId ?? ""] }}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
              </div>
            </div>

            <article className="inspection-card">
              <div className="inspection-card__header">
                <div>
                  <h3>Segment inspection</h3>
                  <p>
                    {result.projection_method.toUpperCase()} projection ·{" "}
                    {result.point_count} points
                  </p>
                </div>
              </div>

              {activePoint ? (
                <div className="visualization-detail">
                  <div className="inspection-card__meta">
                    <span className="pill">{activePoint.document_label}</span>
                    <span className="pill">{activePoint.role}</span>
                    <span className="pill">{activePoint.language || "language pending"}</span>
                  </div>
                  <dl className="review-card__details">
                    <div>
                      <dt>Segment</dt>
                      <dd>#{activePoint.segment_index}</dd>
                    </div>
                    <div>
                      <dt>Model</dt>
                      <dd>{activePoint.model_name.split("/").pop()}</dd>
                    </div>
                    <div>
                      <dt>Dim</dt>
                      <dd>{activePoint.embedding_dim}</dd>
                    </div>
                  </dl>
                  <article className="inspection-segment visualization-detail__segment">
                    <div className="inspection-segment__meta">
                      <span>{activePoint.document_label}</span>
                      <span>
                        x {activePoint.x.toFixed(3)} · y {activePoint.y.toFixed(3)}
                      </span>
                    </div>
                    <p>{activePoint.text}</p>
                  </article>
                </div>
              ) : (
                <EmptyPanel message="Hover over a point to inspect its segment." compact />
              )}

              {result.notes.length > 0 ? (
                <div className="visualization-notes">
                  {result.notes.map((note) => (
                    <p key={note} className="inline-note">
                      {note}
                    </p>
                  ))}
                  <p className="inline-note">
                    Highly similar segments can project very close together, and
                    PCA on a small dataset can compress variation.
                  </p>
                </div>
              ) : null}
            </article>
          </div>

          {showCoordinatesTable ? (
            <div className="pairs-table-wrap">
              <table className="pipeline-table">
                <thead>
                  <tr>
                    <th>document</th>
                    <th>role</th>
                    <th>idx</th>
                    <th>x</th>
                    <th>y</th>
                  </tr>
                </thead>
                <tbody>
                  {plottedPoints.map((point) => (
                    <tr
                      key={`coords-${point.segment_id}`}
                      className={
                        activePoint?.segment_id === point.segment_id
                          ? "pipeline-table__row--active"
                          : ""
                      }
                    >
                      <td>{point.document_label}</td>
                      <td>{point.role}</td>
                      <td>{point.segment_index}</td>
                      <td>{point.x.toFixed(5)}</td>
                      <td>{point.y.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

type PlotPoint = VisualizationPoint & {
  plotX: number;
  plotY: number;
};

function normalizePointsForPlot(
  points: VisualizationPoint[],
  useJitter: boolean,
): PlotPoint[] {
  if (points.length === 0) {
    return [];
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  const xPadding = Math.max(xRange * 0.08, 0.000001);
  const yPadding = Math.max(yRange * 0.08, 0.000001);
  const domainMinX = minX - xPadding;
  const domainMaxX = maxX + xPadding;
  const domainMinY = minY - yPadding;
  const domainMaxY = maxY + yPadding;
  const domainRangeX = domainMaxX - domainMinX || 1;
  const domainRangeY = domainMaxY - domainMinY || 1;

  const basePoints = points.map((point) => ({
    ...point,
    plotX: 10 + ((point.x - domainMinX) / domainRangeX) * 80,
    plotY: 90 - ((point.y - domainMinY) / domainRangeY) * 80,
  }));

  return useJitter ? applyDisplayJitter(basePoints) : basePoints;
}

function applyDisplayJitter(points: PlotPoint[]): PlotPoint[] {
  const groups = new Map<string, PlotPoint[]>();

  points.forEach((point) => {
    const bucketX = Math.round(point.plotX * 2) / 2;
    const bucketY = Math.round(point.plotY * 2) / 2;
    const key = `${bucketX}:${bucketY}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  });

  return Array.from(groups.values()).flatMap((group) => {
    if (group.length === 1) {
      return group;
    }

    return group.map((point, index) => {
      const angle = (Math.PI * 2 * index) / group.length;
      const radius = Math.min(1.4, 0.55 + group.length * 0.12);
      const jitterSeed = stableSeed(point.segment_id);
      const offsetX = Math.cos(angle + jitterSeed) * radius;
      const offsetY = Math.sin(angle + jitterSeed) * radius;

      return {
        ...point,
        plotX: clamp(point.plotX + offsetX, 8, 92),
        plotY: clamp(point.plotY + offsetY, 8, 92),
      };
    });
  });
}

function stableSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 3600;
  }
  return (hash / 3600) * Math.PI * 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDomain(points: PlotPoint[], axis: "x" | "y") {
  if (points.length === 0) {
    return "—";
  }

  const values = points.map((point) => (axis === "x" ? point.x : point.y));
  return `${Math.min(...values).toFixed(3)} to ${Math.max(...values).toFixed(3)}`;
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
