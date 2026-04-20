export type UploadMetadata = {
  title: string | null;
  work_name: string | null;
  source_language: string | null;
  translation_language: string | null;
};

export type ParsedFileSummary = {
  filename: string;
  extension: string;
  content_length: number;
  preview: string;
};

export type SegmentPreviewItem = {
  segment_index: number;
  text: string;
  char_count: number;
};

export type DocumentPlaceholder = {
  id: string;
  role: "original" | "translation" | string;
  title: string;
  work_name: string | null;
  language: string | null;
  translator_name: string | null;
  filename: string;
  content_length: number;
  segment_count: number;
  segments: SegmentPreviewItem[];
  status: string;
  created_at?: string | null;
};

export type UploadResponse = {
  upload_id: string;
  status: string;
  metadata: UploadMetadata;
  source_file: ParsedFileSummary;
  translation_files: ParsedFileSummary[];
  documents: DocumentPlaceholder[];
  notes: string[];
};

export type UploadRequestInput = {
  sourceFile: File;
  translationFiles: File[];
  title?: string;
  workName?: string;
  sourceLanguage?: string;
  translationLanguage?: string;
};

export type UploadReviewItem = {
  id: string;
  documentId?: string;
  label: string;
  role: "original" | "translation";
  language: string | null;
  contentLength: number;
  segmentCount: number;
  segments: SegmentPreviewItem[];
  preview: string;
  status: string;
  sourceKind: "backend-upload" | "local-paste";
  filename?: string;
};

export type UploadReviewState = {
  mode: "upload-files" | "paste-text";
  title: string;
  workName: string;
  sourceLanguage: string;
  translationLanguage: string;
  items: UploadReviewItem[];
  notes: string[];
  uploadId?: string;
  status: string;
};
