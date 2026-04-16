export const workflowCards = [
  {
    title: "Ingest texts",
    description:
      "Bring in one source text and multiple translations for comparison experiments.",
  },
  {
    title: "Segment passages",
    description:
      "Break long-form documents into manageable aligned passages for downstream analysis.",
  },
  {
    title: "Embed semantically",
    description:
      "Generate multilingual vector representations for source and translated passages.",
  },
  {
    title: "Explore distance",
    description:
      "Inspect semantic similarity patterns across aligned passages and translation variants.",
  },
];

export const projectSummaries = [
  {
    name: "Parallel Poetry Set",
    sourceLanguage: "English",
    translationCount: 3,
    status: "Draft",
  },
  {
    name: "Modern Essays Corpus",
    sourceLanguage: "French",
    translationCount: 2,
    status: "Ready",
  },
  {
    name: "Historical Sermons",
    sourceLanguage: "German",
    translationCount: 4,
    status: "In Review",
  },
];

export const uploadChecklist = [
  "Choose one original text as the reference document.",
  "Attach one or more translations for the same work.",
  "Review segmentation settings before processing.",
  "Confirm metadata such as title, language, and edition.",
];

export const exploreMetrics = [
  {
    label: "Mock Projects",
    value: "03",
    description: "Placeholder research projects available in the current UI state.",
  },
  {
    label: "Passage Pairs",
    value: "148",
    description: "Synthetic aligned segments used to illustrate future comparison screens.",
  },
  {
    label: "Embedding Model",
    value: "MiniLM",
    description: "Temporary stand-in for the multilingual model that will be selected later.",
  },
];

export const explorationHighlights = [
  "Nearest-neighbor comparisons between aligned passages",
  "Distance trends across translation variants",
  "Filters for language, work, and segmentation strategy",
];
