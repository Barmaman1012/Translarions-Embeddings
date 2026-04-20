"use client";

import type { UploadReviewState } from "@/types/upload";

type SegmentationPreviewSectionProps = {
  review: UploadReviewState | null;
};

export function SegmentationPreviewSection({
  review,
}: SegmentationPreviewSectionProps) {
  return (
    <div className="inspection-stack">
      {!review ? (
        <EmptyPanel message="Upload texts to inspect stored segments." />
      ) : (
        review.items.map((item) => (
          <article key={item.id} className="inspection-card">
            <div className="inspection-card__header">
              <div>
                <h3>{item.label}</h3>
                <p>
                  {item.role} · {item.language || "language pending"} ·{" "}
                  {item.segmentCount} segments
                </p>
              </div>
              <div className="inspection-card__meta">
                <span className="pill">{item.role}</span>
                <span className="pill">{item.segmentCount} stored</span>
              </div>
            </div>

            {item.segments.length > 0 ? (
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
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel message="Segments are not available for local preview mode yet." compact />
            )}
          </article>
        ))
      )}
    </div>
  );
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

