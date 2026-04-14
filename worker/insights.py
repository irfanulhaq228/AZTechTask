import json
import os
from typing import Any

try:
    from google import genai
except ImportError:  # pragma: no cover - optional at runtime
    genai = None


def build_heuristic_insights(stats: dict[str, Any]) -> tuple[str, list[dict[str, str]], str]:
    issues: list[dict[str, str]] = []

    total_rows = stats.get("totalRows", 0)
    processed_rows = stats.get("processedRows", 0)
    duplicate_rows = stats.get("duplicateRows", 0)
    error_rows = stats.get("errorRows", 0)
    headers = stats.get("headers", [])
    missing_counts = stats.get("missingFieldCounts", [])
    common_values = stats.get("commonValues", [])

    if duplicate_rows:
        issues.append(
            {
                "label": "Duplicate rows removed",
                "detail": f"{duplicate_rows} duplicate rows were skipped during processing.",
            }
        )

    if error_rows:
        issues.append(
            {
                "label": "Rows with processing errors",
                "detail": f"{error_rows} rows could not be normalized successfully.",
            }
        )

    for missing in missing_counts[:3]:
        if missing["count"] > 0:
            issues.append(
                {
                    "label": f"Missing values in {missing['field']}",
                    "detail": f"{missing['count']} rows were empty for this field.",
                }
            )

    top_common = common_values[0]["field"] if common_values else "the dataset"
    summary = (
        f"Processed {processed_rows} of {total_rows} rows across {len(headers)} detected fields. "
        f"The strongest repeating patterns are in {top_common}, with duplicates and missing-value hotspots highlighted below."
    )

    return summary, issues, "heuristic"


def _extract_json_block(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("Model response did not contain JSON.")

    return json.loads(text[start : end + 1])


def build_ai_insights(stats: dict[str, Any]) -> tuple[str, list[dict[str, str]], str]:
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key or genai is None:
        return build_heuristic_insights(stats)

    prompt = f"""
You are analyzing a product CSV import. Return only JSON with this shape:
{{
  "summary": "short paragraph",
  "issues": [
    {{"label": "short title", "detail": "one sentence"}}
  ]
}}

Base your answer only on these computed stats:
{json.dumps(stats, indent=2)}
""".strip()

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model_name, contents=prompt)
        payload = _extract_json_block(response.text)
        summary = payload.get("summary")
        issues = payload.get("issues")

        if not isinstance(summary, str) or not isinstance(issues, list):
            raise ValueError("Gemini response schema was invalid.")

        normalized_issues = [
            {
                "label": str(item.get("label", "Issue")),
                "detail": str(item.get("detail", "")),
            }
            for item in issues
            if isinstance(item, dict)
        ]

        return summary, normalized_issues, model_name
    except Exception:
        return build_heuristic_insights(stats)
