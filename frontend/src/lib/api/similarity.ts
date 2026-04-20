import { getApiBaseUrl } from "@/lib/api/base-url";
import type {
  SimilarityRequestInput,
  SimilarityResponse,
} from "@/types/analysis";

export async function runSimilarityAnalysis(
  input: SimilarityRequestInput,
): Promise<SimilarityResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/similarity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: input.modelName,
      source_document_id: input.sourceDocumentId,
      target_document_ids: input.targetDocumentIds,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | SimilarityResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    throw new Error(extractApiError(payload) ?? "Similarity request failed.");
  }

  return payload as SimilarityResponse;
}

function extractApiError(
  payload: { detail?: string } | SimilarityResponse | null,
) {
  if (!payload) {
    return null;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  return null;
}

