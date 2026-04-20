export const SUPPORTED_EMBEDDING_MODELS = [
  "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  "sentence-transformers/LaBSE",
  "intfloat/multilingual-e5-base",
] as const;

export type SupportedEmbeddingModel = (typeof SUPPORTED_EMBEDDING_MODELS)[number];

export type EmbedRequestInput = {
  modelName: string;
  documentId?: string;
  reembed?: boolean;
};

export type EmbedResponse = {
  model_name: string;
  embedding_dim: number;
  number_of_segments_embedded: number;
  affected_document_ids: string[];
};

export type SimilarityRequestInput = {
  modelName: string;
  sourceDocumentId: string;
  targetDocumentIds: string[];
};

export type SegmentPairSimilarity = {
  source_segment_id: string;
  target_segment_id: string;
  segment_index: number;
  source_text: string;
  target_text: string;
  similarity_score: number;
};

export type TargetDocumentSimilarity = {
  target_document_id: string;
  compared_segments_count: number;
  average_similarity: number | null;
  segment_pairs: SegmentPairSimilarity[];
};

export type SimilarityResponse = {
  model_name: string;
  source_document_id: string;
  targets: TargetDocumentSimilarity[];
};

export type VisualizationRequestInput = {
  modelName: string;
  documentIds: string[];
  projectionMethod?: "pca";
};

export type VisualizationPoint = {
  segment_id: string;
  document_id: string;
  document_label: string;
  role: string;
  language: string | null;
  segment_index: number;
  text: string;
  model_name: string;
  embedding_dim: number;
  x: number;
  y: number;
};

export type VisualizationResponse = {
  model_name: string;
  projection_method: string;
  point_count: number;
  points: VisualizationPoint[];
  notes: string[];
};

