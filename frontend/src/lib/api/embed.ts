import { getApiBaseUrl } from "@/lib/api/base-url";
import type { EmbedRequestInput, EmbedResponse } from "@/types/analysis";

export async function runEmbeddings(
  input: EmbedRequestInput,
): Promise<EmbedResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: input.modelName,
      document_id: input.documentId,
      reembed: input.reembed ?? false,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | EmbedResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    throw new Error(extractApiError(payload) ?? "Embedding request failed.");
  }

  return payload as EmbedResponse;
}

function extractApiError(payload: { detail?: string } | EmbedResponse | null) {
  if (!payload) {
    return null;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  return null;
}

