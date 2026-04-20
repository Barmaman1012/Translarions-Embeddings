import type {
  UploadRequestInput,
  UploadResponse,
  UploadReviewItem,
  UploadReviewState,
} from "@/types/upload";
import { getApiBaseUrl } from "@/lib/api/base-url";

export async function uploadDocuments(
  input: UploadRequestInput,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("source_file", input.sourceFile);

  input.translationFiles.forEach((file) => {
    formData.append("translation_files", file);
  });

  appendOptionalField(formData, "title", input.title);
  appendOptionalField(formData, "work_name", input.workName);
  appendOptionalField(formData, "source_language", input.sourceLanguage);
  appendOptionalField(
    formData,
    "translation_language",
    input.translationLanguage,
  );

  const requestUrl = `${getApiBaseUrl()}/api/v1/upload`;
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed.";
    throw new Error(`Request to ${requestUrl} failed: ${message}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | UploadResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    throw new Error(extractApiError(payload) ?? "Upload failed.");
  }

  return payload as UploadResponse;
}

export function mapUploadResponseToReview(
  response: UploadResponse,
): UploadReviewState {
  const reviewItems: UploadReviewItem[] = response.documents.map(
    (document, index) => {
      const parsedFile =
        document.role === "original"
          ? response.source_file
          : response.translation_files[index - 1];

      return {
        id: `${response.upload_id}-${document.role}-${index}`,
        documentId: document.id,
        label: document.title || parsedFile?.filename || `Document ${index + 1}`,
        role: document.role === "translation" ? "translation" : "original",
        language: document.language,
        contentLength: document.content_length,
        segmentCount: document.segment_count,
        segments: document.segments,
        preview: parsedFile?.preview ?? "",
        status: document.status,
        sourceKind: "backend-upload",
        filename: document.filename,
      };
    },
  );

  return {
    mode: "upload-files",
    title: response.metadata.title ?? "",
    workName: response.metadata.work_name ?? "",
    sourceLanguage: response.metadata.source_language ?? "",
    translationLanguage: response.metadata.translation_language ?? "",
    items: reviewItems,
    notes: response.notes,
    uploadId: response.upload_id,
    status: response.status,
  };
}

function appendOptionalField(
  formData: FormData,
  key: string,
  value: string | undefined,
) {
  if (value && value.trim()) {
    formData.append(key, value.trim());
  }
}

function extractApiError(payload: { detail?: string } | UploadResponse | null) {
  if (!payload) {
    return null;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  return null;
}
