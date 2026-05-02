"use client";

import { useState } from "react";

import { ParsedUploadReview } from "@/components/upload/parsed-upload-review";
import {
  ingestRawText,
  mapUploadResponseToReview,
  uploadDocuments,
} from "@/lib/api/upload";
import type { UploadReviewState } from "@/types/upload";

type InputMode = "upload-files" | "paste-text";

type MetadataForm = {
  title: string;
  workName: string;
  sourceLanguage: string;
  translationLanguage: string;
};

type PastedTranslation = {
  id: string;
  label: string;
  text: string;
};

const INITIAL_METADATA: MetadataForm = {
  title: "",
  workName: "",
  sourceLanguage: "",
  translationLanguage: "",
};

type UploadWorkspaceProps = {
  embedded?: boolean;
  heading?: string;
  description?: string;
  note?: string;
  showReview?: boolean;
  onReviewChange?: (review: UploadReviewState | null) => void;
};

export function UploadWorkspace({
  embedded = false,
  heading = "Upload or paste texts for inspection",
  description = "Use file upload or pasted text to run the same backend ingestion flow and inspect parsed, persisted documents before downstream analysis.",
  note = "This is the inspection stage before segmentation. Confirm the parsed content here before any downstream chunking or embedding work.",
  showReview = true,
  onReviewChange,
}: UploadWorkspaceProps) {
  const [inputMode, setInputMode] = useState<InputMode>("upload-files");
  const [metadata, setMetadata] = useState<MetadataForm>(INITIAL_METADATA);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [translationFiles, setTranslationFiles] = useState<File[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [translations, setTranslations] = useState<PastedTranslation[]>([
    createTranslationDraft(1),
  ]);
  const [review, setReview] = useState<UploadReviewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceFile) {
      setErrorMessage("Select one source file before submitting.");
      return;
    }

    if (translationFiles.length === 0) {
      setErrorMessage("Select at least one translation file before submitting.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await uploadDocuments({
        sourceFile,
        translationFiles,
        title: metadata.title,
        workName: metadata.workName,
        sourceLanguage: metadata.sourceLanguage,
        translationLanguage: metadata.translationLanguage,
      });

      const nextReview = mapUploadResponseToReview(response, "upload-files");
      setReview(nextReview);
      onReviewChange?.(nextReview);
    } catch (error) {
      setReview(null);
      onReviewChange?.(null);
      setErrorMessage(
        error instanceof Error ? error.message : "The upload request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePastePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceText.trim()) {
      setErrorMessage("Paste source text before submitting.");
      return;
    }

    const filledTranslations = translations.filter((item) => item.text.trim());
    if (filledTranslations.length === 0) {
      setErrorMessage("Paste at least one translation text before submitting.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await ingestRawText({
        title: metadata.title,
        workName: metadata.workName,
        sourceLanguage: metadata.sourceLanguage,
        translationLanguage: metadata.translationLanguage,
        sourceText,
        translations: filledTranslations.map((item, index) => ({
          label: item.label.trim() || `Translation ${index + 1}`,
          text: item.text,
        })),
      });

      const nextReview = mapUploadResponseToReview(response, "paste-text");
      setReview(nextReview);
      onReviewChange?.(nextReview);
    } catch (error) {
      setReview(null);
      onReviewChange?.(null);
      setErrorMessage(
        error instanceof Error ? error.message : "The paste ingestion request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateMetadata(field: keyof MetadataForm, value: string) {
    setMetadata((current) => ({ ...current, [field]: value }));
  }

  function updateTranslation(id: string, patch: Partial<PastedTranslation>) {
    setTranslations((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addTranslation() {
    setTranslations((current) => [
      ...current,
      createTranslationDraft(current.length + 1),
    ]);
  }

  function removeTranslation(id: string) {
    setTranslations((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  }

  const shellClassName = embedded ? "workspace-stage" : "page";

  return (
    <div className={shellClassName}>
      <section className={embedded ? "" : "section"}>
        <div className="section-title">
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>

        <article className="app-surface">
          <div className="mode-switch" role="tablist" aria-label="Input mode">
            <button
              type="button"
              className={`mode-switch__button${
                inputMode === "upload-files" ? " mode-switch__button--active" : ""
              }`}
              onClick={() => {
                setInputMode("upload-files");
                setErrorMessage(null);
              }}
            >
              Upload files
            </button>
            <button
              type="button"
              className={`mode-switch__button${
                inputMode === "paste-text" ? " mode-switch__button--active" : ""
              }`}
              onClick={() => {
                setInputMode("paste-text");
                setErrorMessage(null);
              }}
            >
              Paste text manually
            </button>
          </div>

          <p className="inline-note">
            {note}
          </p>

          {errorMessage ? (
            <div className="form-message form-message--error">{errorMessage}</div>
          ) : null}

          {inputMode === "upload-files" ? (
            <form className="ingestion-form" onSubmit={handleFileSubmit}>
              <MetadataFields metadata={metadata} onChange={updateMetadata} />

              <div className="grid grid--cards">
                <label className="field">
                  <span className="field__label">Source file</span>
                  <input
                    type="file"
                    accept=".txt,.md,.json"
                    onChange={(event) =>
                      setSourceFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <span className="field__hint">
                    Accepts one `.txt`, `.md`, or `.json` file.
                  </span>
                </label>

                <label className="field">
                  <span className="field__label">Translation files</span>
                  <input
                    type="file"
                    accept=".txt,.md,.json"
                    multiple
                    onChange={(event) =>
                      setTranslationFiles(Array.from(event.target.files ?? []))
                    }
                  />
                  <span className="field__hint">
                    Select one or more translation files.
                  </span>
                </label>
              </div>

              <div className="file-list">
                <p>
                  Source: <strong>{sourceFile?.name ?? "No file selected"}</strong>
                </p>
                <p>
                  Translations:{" "}
                  <strong>
                    {translationFiles.length > 0
                      ? translationFiles.map((file) => file.name).join(", ")
                      : "No files selected"}
                  </strong>
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={loading}
                >
                  {loading ? "Parsing upload..." : "Upload and Parse"}
                </button>
              </div>
            </form>
          ) : (
            <form className="ingestion-form" onSubmit={handlePastePreview}>
              <MetadataFields metadata={metadata} onChange={updateMetadata} />

              <label className="field">
                <span className="field__label">Source text</span>
                <textarea
                  rows={10}
                  placeholder="Paste the original text here."
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                />
              </label>

              <div className="grid">
                {translations.map((item, index) => (
                  <article key={item.id} className="app-surface app-surface--nested">
                    <div className="translation-header">
                      <h3>Translation {index + 1}</h3>
                      <button
                        type="button"
                        className="button button--secondary button--small"
                        onClick={() => removeTranslation(item.id)}
                        disabled={translations.length === 1}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="field">
                      <span className="field__label">Label</span>
                      <input
                        type="text"
                        placeholder={`Translation ${index + 1}`}
                        value={item.label}
                        onChange={(event) =>
                          updateTranslation(item.id, { label: event.target.value })
                        }
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Translation text</span>
                      <textarea
                        rows={8}
                        placeholder="Paste translated text here."
                        value={item.text}
                        onChange={(event) =>
                          updateTranslation(item.id, { text: event.target.value })
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={addTranslation}
                  disabled={loading}
                >
                  Add Translation
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={loading}
                >
                  {loading ? "Ingesting text..." : "Ingest and Review"}
                </button>
              </div>
            </form>
          )}
        </article>
      </section>

      {showReview ? <ParsedUploadReview review={review} /> : null}
    </div>
  );
}

type MetadataFieldsProps = {
  metadata: MetadataForm;
  onChange: (field: keyof MetadataForm, value: string) => void;
};

function MetadataFields({ metadata, onChange }: MetadataFieldsProps) {
  return (
    <div className="metadata-grid">
      <label className="field">
        <span className="field__label">Title</span>
        <input
          type="text"
          value={metadata.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Optional project or text title"
        />
      </label>

      <label className="field">
        <span className="field__label">Work name</span>
        <input
          type="text"
          value={metadata.workName}
          onChange={(event) => onChange("workName", event.target.value)}
          placeholder="Optional shared work label"
        />
      </label>

      <label className="field">
        <span className="field__label">Source language</span>
        <input
          type="text"
          value={metadata.sourceLanguage}
          onChange={(event) => onChange("sourceLanguage", event.target.value)}
          placeholder="e.g. en"
        />
      </label>

      <label className="field">
        <span className="field__label">Translation language</span>
        <input
          type="text"
          value={metadata.translationLanguage}
          onChange={(event) => onChange("translationLanguage", event.target.value)}
          placeholder="e.g. es or multi"
        />
      </label>
    </div>
  );
}

function createTranslationDraft(index: number): PastedTranslation {
  return {
    id: `translation-${index}-${Math.random().toString(36).slice(2, 8)}`,
    label: `Translation ${index}`,
    text: "",
  };
}
