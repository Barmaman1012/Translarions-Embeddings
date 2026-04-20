import json
from pathlib import Path


SUPPORTED_TEXT_EXTENSIONS = {".txt", ".md", ".json"}
PREVIEW_LENGTH = 220


class FileParsingError(ValueError):
    """Raised when an uploaded file cannot be parsed into plain text."""


def parse_uploaded_text(filename: str, content: bytes) -> tuple[str, str]:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_TEXT_EXTENSIONS:
        allowed = ", ".join(sorted(SUPPORTED_TEXT_EXTENSIONS))
        raise FileParsingError(
            f"Unsupported file type for '{filename}'. Allowed extensions: {allowed}."
        )

    if not content:
        raise FileParsingError(f"Uploaded file '{filename}' is empty.")

    decoded = _decode_bytes(filename, content)
    if extension == ".json":
        text = _extract_text_from_json(filename, decoded)
    else:
        text = decoded.strip()

    if not text:
        raise FileParsingError(f"Uploaded file '{filename}' did not contain usable text.")

    return extension, text


def build_preview(text: str, limit: int = PREVIEW_LENGTH) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[: limit - 3].rstrip()}..."


def _decode_bytes(filename: str, content: bytes) -> str:
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise FileParsingError(
            f"Could not decode '{filename}' as UTF-8 text."
        ) from exc


def _extract_text_from_json(filename: str, decoded: str) -> str:
    try:
        payload = json.loads(decoded)
    except json.JSONDecodeError as exc:
        raise FileParsingError(f"Uploaded JSON file '{filename}' is not valid JSON.") from exc

    extracted = _json_to_text(payload)
    if not extracted:
        raise FileParsingError(
            f"Uploaded JSON file '{filename}' does not contain extractable text."
        )
    return extracted


def _json_to_text(value: object) -> str:
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, list):
        parts = [_json_to_text(item) for item in value]
        return "\n\n".join(part for part in parts if part)

    if isinstance(value, dict):
        for preferred_key in ("text", "content", "body", "markdown"):
            preferred_value = value.get(preferred_key)
            if isinstance(preferred_value, str) and preferred_value.strip():
                return preferred_value.strip()

        parts = [_json_to_text(item) for item in value.values()]
        return "\n\n".join(part for part in parts if part)

    return ""
