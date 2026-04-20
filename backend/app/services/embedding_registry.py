from dataclasses import dataclass
from functools import lru_cache

from sentence_transformers import SentenceTransformer


@dataclass(frozen=True)
class EmbeddingModelDefinition:
    model_name: str
    text_prefix: str = ""
    normalize_embeddings: bool = False


SUPPORTED_EMBEDDING_MODELS = {
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": EmbeddingModelDefinition(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    ),
    "sentence-transformers/LaBSE": EmbeddingModelDefinition(
        model_name="sentence-transformers/LaBSE"
    ),
    "intfloat/multilingual-e5-base": EmbeddingModelDefinition(
        model_name="intfloat/multilingual-e5-base",
        text_prefix="passage: ",
    ),
}


def get_embedding_model_definition(model_name: str) -> EmbeddingModelDefinition:
    try:
        return SUPPORTED_EMBEDDING_MODELS[model_name]
    except KeyError as exc:
        supported = ", ".join(SUPPORTED_EMBEDDING_MODELS.keys())
        raise ValueError(
            f"Unsupported model_name '{model_name}'. Supported models: {supported}"
        ) from exc


def get_supported_model_names() -> list[str]:
    return list(SUPPORTED_EMBEDDING_MODELS.keys())


@lru_cache(maxsize=4)
def load_sentence_transformer(model_name: str) -> SentenceTransformer:
    definition = get_embedding_model_definition(model_name)
    return SentenceTransformer(definition.model_name)
