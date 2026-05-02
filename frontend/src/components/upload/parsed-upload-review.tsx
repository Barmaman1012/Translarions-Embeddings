import type { UploadReviewState } from "@/types/upload";

type ParsedUploadReviewProps = {
  review: UploadReviewState | null;
};

export function ParsedUploadReview({ review }: ParsedUploadReviewProps) {
  return (
    <section className="section">
      <div className="section-title">
        <span className="section-title__eyebrow">Review</span>
        <h2>Parsed Upload Review</h2>
        <p>
          Inspect the parsed text before segmentation. This stage is meant to
          confirm that filenames, roles, languages, and preview content look
          correct.
        </p>
      </div>

      {!review ? (
        <article className="placeholder-panel">
          <h3>No parsed result yet</h3>
          <p>
            Submit files or pasted text to the backend to inspect the ingestion
            result here.
          </p>
        </article>
      ) : (
        <div className="grid">
          <article className="placeholder-panel">
            <div className="review-summary">
              <div>
                <h3>Inspection Summary</h3>
                <p>
                  Status: <strong>{review.status}</strong>
                </p>
                {review.uploadId ? (
                  <p>
                    Upload ID: <strong>{review.uploadId}</strong>
                  </p>
                ) : null}
              </div>
              <div className="pill-row">
                <span className="pill">Mode: {review.mode}</span>
                {review.title ? <span className="pill">Title: {review.title}</span> : null}
                {review.workName ? (
                  <span className="pill">Work: {review.workName}</span>
                ) : null}
              </div>
            </div>

            {review.notes.length > 0 ? (
              <ul className="placeholder-list">
                {review.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </article>

          <div className="grid grid--cards">
            {review.items.map((item) => (
              <article key={item.id} className="card review-card">
                <div className="review-card__meta">
                  <span className="pill">{item.role}</span>
                  <span className="pill">{item.sourceKind}</span>
                  <span className="pill">status: {item.status}</span>
                </div>
                <h3>{item.label}</h3>
                <p className="review-card__subtle">
                  {item.filename ? `File: ${item.filename}` : "Manual text entry"}
                </p>
                <dl className="review-card__details">
                  <div>
                    <dt>Language</dt>
                    <dd>{item.language || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Content Length</dt>
                    <dd>{item.contentLength} chars</dd>
                  </div>
                  <div>
                    <dt>Segments</dt>
                    <dd>{item.segmentCount}</dd>
                  </div>
                </dl>
                <p>{item.preview || "No preview available."}</p>

                <div className="segments-preview">
                  <div className="segments-preview__header">
                    <h4>Segments Preview</h4>
                  </div>

                  {item.segments.length > 0 ? (
                    <div className="segments-preview__list">
                      {item.segments.map((segment) => (
                        <article
                          key={`${item.id}-${segment.segment_index}`}
                          className="segments-preview__item"
                        >
                          <div className="segments-preview__meta">
                            <span>#{segment.segment_index}</span>
                            <span>{segment.char_count} chars</span>
                          </div>
                          <p>{segment.text}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="review-card__subtle">
                      No stored segments were returned for this document.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
