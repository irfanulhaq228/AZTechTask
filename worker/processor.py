import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


NAME_HINTS = ("name", "title", "product", "item")
PRICE_HINTS = ("price", "cost", "amount", "value", "msrp")
COMMON_VALUE_HINTS = ("category", "brand", "vendor", "type")


def normalize_text(value: Any) -> str:
    if value is None:
        return ""

    text = str(value).replace("\u00a0", " ").strip()
    return re.sub(r"\s+", " ", text)


def normalize_header(value: str | None, index: int, seen: set[str]) -> str:
    base = normalize_text(value) or f"column_{index}"
    candidate = base
    suffix = 2

    while candidate.lower() in seen:
        candidate = f"{base}_{suffix}"
        suffix += 1

    seen.add(candidate.lower())
    return candidate


def pick_best_field(headers: list[str], hints: tuple[str, ...]) -> str | None:
    lowered = [(header, header.lower()) for header in headers]

    for header, lowered_header in lowered:
        if lowered_header in hints:
            return header

    for header, lowered_header in lowered:
        if any(hint in lowered_header for hint in hints):
            return header

    return None


def parse_price(value: Any) -> float | None:
    text = normalize_text(value)

    if not text:
        return None

    cleaned = re.sub(r"[^0-9,.\-]", "", text)

    if cleaned.count(",") and cleaned.count("."):
        cleaned = cleaned.replace(",", "")
    elif cleaned.count(",") == 1 and cleaned.count(".") == 0:
        cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "")

    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def slugify(value: str) -> str | None:
    if not value:
        return None

    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or None


def build_dedupe_key(
    clean_data: dict[str, Any],
    headers: list[str],
    name_normalized: str,
    price_normalized: float | None,
) -> str:
    extra_parts = []

    for hint in ("category", "brand", "sku"):
        match = pick_best_field(headers, (hint,))
        if match:
            extra_parts.append(normalize_text(clean_data.get(match)).lower())

    dedupe_parts = [
        name_normalized.lower(),
        "" if price_normalized is None else f"{price_normalized:.2f}",
        *extra_parts,
    ]

    if not any(dedupe_parts):
        dedupe_parts.append(json.dumps(clean_data, sort_keys=True))

    return "|".join(
        [
            *dedupe_parts,
        ]
    )


def summarize_common_values(
    value_counters: dict[str, Counter[str]],
) -> list[dict[str, Any]]:
    hinted = []
    remaining = []

    for field, counter in value_counters.items():
        unique_count = len(counter)

        if unique_count == 0 or unique_count > 20:
            continue

        item = {
            "field": field,
            "values": [
                {"value": value, "count": count}
                for value, count in counter.most_common(5)
            ],
        }

        if any(hint in field.lower() for hint in COMMON_VALUE_HINTS):
            hinted.append(item)
        else:
            remaining.append(item)

    chosen = hinted[:3]

    if len(chosen) < 3:
        chosen.extend(remaining[: 3 - len(chosen)])

    return chosen


def process_csv_file(file_path: str) -> dict[str, Any]:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Upload not found at {file_path}")

    products: list[dict[str, Any]] = []
    error_details: list[dict[str, Any]] = []
    missing_counts: defaultdict[str, int] = defaultdict(int)
    value_counters: defaultdict[str, Counter[str]] = defaultdict(Counter)
    seen_dedupe_keys: set[str] = set()
    duplicate_rows = 0
    error_rows = 0
    total_rows = 0

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)

        if not reader.fieldnames:
            raise ValueError("CSV file must include a header row.")

        seen_headers: set[str] = set()
        headers = [
            normalize_header(field_name, index + 1, seen_headers)
            for index, field_name in enumerate(reader.fieldnames)
        ]
        header_map = dict(zip(reader.fieldnames, headers))
        name_field = pick_best_field(headers, NAME_HINTS)
        price_field = pick_best_field(headers, PRICE_HINTS)

        for row_number, row in enumerate(reader, start=1):
            total_rows += 1

            try:
                raw_data = {
                    header_map.get(original_header, f"extra_{index + 1}"): (
                        "" if value is None else str(value)
                    )
                    for index, (original_header, value) in enumerate(row.items())
                }
                clean_data = {
                    field: normalize_text(value) for field, value in raw_data.items()
                }

                if not any(clean_data.values()):
                    raise ValueError("Row is empty after trimming values.")

                for field, value in clean_data.items():
                    if not value:
                        missing_counts[field] += 1
                    elif len(value) <= 60:
                        value_counters[field][value] += 1

                name_normalized = clean_data.get(name_field, "") if name_field else ""
                price_normalized = parse_price(clean_data.get(price_field)) if price_field else None
                slug = slugify(name_normalized or clean_data.get(headers[0], ""))
                dedupe_key = build_dedupe_key(
                    clean_data=clean_data,
                    headers=headers,
                    name_normalized=name_normalized,
                    price_normalized=price_normalized,
                )

                if dedupe_key in seen_dedupe_keys:
                    duplicate_rows += 1
                    continue

                seen_dedupe_keys.add(dedupe_key)
                products.append(
                    {
                        "row_number": row_number,
                        "name_normalized": name_normalized or None,
                        "price_normalized": price_normalized,
                        "slug": slug,
                        "dedupe_key": dedupe_key,
                        "raw_data": raw_data,
                        "clean_data": clean_data,
                    }
                )
            except Exception as exc:
                error_rows += 1

                if len(error_details) < 25:
                    error_details.append(
                        {
                            "rowNumber": row_number,
                            "message": str(exc),
                        }
                    )

    return {
        "headers": headers,
        "total_rows": total_rows,
        "processed_rows": len(products),
        "error_rows": error_rows,
        "duplicate_rows": duplicate_rows,
        "error_details": error_details,
        "products": products,
        "stats": {
            "headers": headers,
            "totalRows": total_rows,
            "processedRows": len(products),
            "errorRows": error_rows,
            "duplicateRows": duplicate_rows,
            "missingFieldCounts": [
                {"field": field, "count": count}
                for field, count in sorted(
                    missing_counts.items(), key=lambda item: item[1], reverse=True
                )
            ],
            "commonValues": summarize_common_values(value_counters),
        },
    }
