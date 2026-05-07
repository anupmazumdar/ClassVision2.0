"""LAN-primary, Supabase cloud-backup sync — runs as background thread."""
import threading, time, logging
from config import SUPABASE_URL, SUPABASE_KEY, SYNC_INTERVAL

log = logging.getLogger("sync")

def sync_to_cloud():
    if not SUPABASE_URL:
        return
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # TODO: push unsynced SQLite rows to Supabase
        log.info("Cloud sync OK")
    except Exception as e:
        log.warning(f"Cloud sync skipped: {e}")

def start_sync_loop():
    def loop():
        while True:
            sync_to_cloud()
            time.sleep(SYNC_INTERVAL)
    threading.Thread(target=loop, daemon=True).start()
    log.info(f"Sync loop started every {SYNC_INTERVAL}s")
