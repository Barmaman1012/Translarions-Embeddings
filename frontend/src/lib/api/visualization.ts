import { getApiBaseUrl } from "@/lib/api/base-url";
import type {
  VisualizationRequestInput,
  VisualizationResponse,
} from "@/types/analysis";

export async function fetchVisualizationData(
  input: VisualizationRequestInput,
): Promise<VisualizationResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/visualization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: input.modelName,
      document_ids: input.documentIds,
      projection_method: input.projectionMethod ?? "pca",
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | VisualizationResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    throw new Error(extractApiError(payload) ?? "Visualization request failed.");
  }

  return payload as VisualizationResponse;
}

function extractApiError(
  payload: { detail?: string } | VisualizationResponse | null,
) {
  if (!payload) {
    return null;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  return null;
}

