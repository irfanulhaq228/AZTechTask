import os
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def _normalize_database_url_for_psycopg(database_url: str) -> tuple[str, str | None]:
    """
    Prisma commonly uses `?schema=public` in DATABASE_URL. libpq/pg mostly tolerates it,
    but psycopg's URI parser rejects unknown query params like `schema`.

    We strip `schema` from the connection URI and return it separately so callers can
    apply `SET search_path` after connecting.
    """
    parts = urlsplit(database_url)
    query_pairs = parse_qsl(parts.query, keep_blank_values=True)
    prisma_schema: str | None = None
    filtered_pairs: list[tuple[str, str]] = []

    for key, value in query_pairs:
        if key == "schema":
            prisma_schema = value or "public"
            continue

        filtered_pairs.append((key, value))

    new_query = urlencode(filtered_pairs, doseq=True)
    normalized = urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))
    return normalized, prisma_schema


def get_connection() -> psycopg.Connection:
    database_url = os.environ["DATABASE_URL"]
    normalized_url, prisma_schema = _normalize_database_url_for_psycopg(database_url)
    conn = psycopg.connect(normalized_url, row_factory=dict_row)

    schema = prisma_schema or "public"
    with conn.cursor() as cur:
        cur.execute("SELECT set_config('search_path', %s, false)", (schema,))

    return conn


def claim_next_upload(conn: psycopg.Connection) -> dict[str, Any] | None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT "id"
                FROM "Upload"
                WHERE "status" = 'PENDING'
                ORDER BY "uploadedAt" ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
                """
            )
            row = cur.fetchone()

            if row is None:
                return None

            cur.execute(
                """
                UPDATE "Upload"
                SET "status" = 'PROCESSING',
                    "startedAt" = NOW(),
                    "failureReason" = NULL
                WHERE "id" = %(upload_id)s
                RETURNING *
                """,
                {"upload_id": row["id"]},
            )
            return cur.fetchone()


def finalize_upload_success(
    conn: psycopg.Connection,
    upload_id: str,
    result: dict[str, Any],
) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            for product in result["products"]:
                cur.execute(
                    """
                    INSERT INTO "Product" (
                      "id",
                      "uploadId",
                      "rowNumber",
                      "nameNormalized",
                      "priceNormalized",
                      "slug",
                      "dedupeKey",
                      "rawData",
                      "cleanData",
                      "createdAt"
                    )
                    VALUES (
                      %(id)s,
                      %(upload_id)s,
                      %(row_number)s,
                      %(name_normalized)s,
                      %(price_normalized)s,
                      %(slug)s,
                      %(dedupe_key)s,
                      %(raw_data)s,
                      %(clean_data)s,
                      NOW()
                    )
                    """,
                    {
                        "id": uuid4().hex,
                        "upload_id": upload_id,
                        "row_number": product["row_number"],
                        "name_normalized": product["name_normalized"],
                        "price_normalized": product["price_normalized"],
                        "slug": product["slug"],
                        "dedupe_key": product["dedupe_key"],
                        "raw_data": Jsonb(product["raw_data"]),
                        "clean_data": Jsonb(product["clean_data"]),
                    },
                )

            cur.execute(
                """
                UPDATE "Upload"
                SET "status" = 'COMPLETED',
                    "completedAt" = NOW(),
                    "detectedHeaders" = %(headers)s,
                    "totalRows" = %(total_rows)s,
                    "processedRows" = %(processed_rows)s,
                    "errorRows" = %(error_rows)s,
                    "duplicateRows" = %(duplicate_rows)s,
                    "errorDetails" = %(error_details)s
                WHERE "id" = %(upload_id)s
                """,
                {
                    "upload_id": upload_id,
                    "headers": Jsonb(result["headers"]),
                    "total_rows": result["total_rows"],
                    "processed_rows": result["processed_rows"],
                    "error_rows": result["error_rows"],
                    "duplicate_rows": result["duplicate_rows"],
                    "error_details": Jsonb(result["error_details"]),
                },
            )


def upsert_insight(
    conn: psycopg.Connection,
    upload_id: str,
    summary: str,
    issues: list[dict[str, Any]],
    stats: dict[str, Any],
    model_name: str,
) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "UploadInsight" (
                  "id",
                  "uploadId",
                  "summary",
                  "issues",
                  "stats",
                  "model",
                  "generatedAt"
                )
                VALUES (
                  %(id)s,
                  %(upload_id)s,
                  %(summary)s,
                  %(issues)s,
                  %(stats)s,
                  %(model)s,
                  NOW()
                )
                ON CONFLICT ("uploadId")
                DO UPDATE SET
                  "summary" = EXCLUDED."summary",
                  "issues" = EXCLUDED."issues",
                  "stats" = EXCLUDED."stats",
                  "model" = EXCLUDED."model",
                  "generatedAt" = NOW()
                """,
                {
                    "id": uuid4().hex,
                    "upload_id": upload_id,
                    "summary": summary,
                    "issues": Jsonb(issues),
                    "stats": Jsonb(stats),
                    "model": model_name,
                },
            )


def mark_upload_failed(
    conn: psycopg.Connection,
    upload_id: str,
    message: str,
    error_details: list[dict[str, Any]] | None = None,
) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "Upload"
                SET "status" = 'FAILED',
                    "completedAt" = NOW(),
                    "failureReason" = %(message)s,
                    "errorDetails" = %(error_details)s
                WHERE "id" = %(upload_id)s
                """,
                {
                    "upload_id": upload_id,
                    "message": message,
                    "error_details": Jsonb(error_details or []),
                },
            )
