import os
import time

from dotenv import load_dotenv

from db import claim_next_upload, finalize_upload_success, get_connection, mark_upload_failed, upsert_insight
from insights import build_ai_insights
from processor import process_csv_file


load_dotenv()


def run_once() -> bool:
    with get_connection() as conn:
        upload = claim_next_upload(conn)

        if upload is None:
            return False

        upload_id = upload["id"]
        stored_path = upload["storedPath"]

        try:
            result = process_csv_file(stored_path)
            finalize_upload_success(conn, upload_id, result)
            summary, issues, model_name = build_ai_insights(result["stats"])
            upsert_insight(conn, upload_id, summary, issues, result["stats"], model_name)
            print(f"Completed upload {upload_id}")
        except Exception as exc:
            mark_upload_failed(conn, upload_id, str(exc))
            print(f"Failed upload {upload_id}: {exc}")

        return True


def main() -> None:
    poll_interval = max(int(os.getenv("WORKER_POLL_INTERVAL_MS", "5000")), 1000) / 1000

    print("Worker started.")

    while True:
        try:
            processed_job = run_once()
        except Exception as exc:
            # Keep the process alive if the DB schema is not ready yet or a transient DB error occurs.
            print(f"Worker loop error: {exc}", flush=True)
            time.sleep(poll_interval)
            continue

        if not processed_job:
            time.sleep(poll_interval)


if __name__ == "__main__":
    main()
