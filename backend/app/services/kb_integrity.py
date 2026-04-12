from pathlib import Path

REQUIRED_KB_FILES = {
    "crop_calendar_uttarakhand.json",
    "fertilizer_basics_north_india.json",
    "weather_rules_general.json",
    "crop_selection_north_india.json",
}


def ensure_kb_files_exist() -> None:
    kb_dir = Path(__file__).resolve().parents[1] / "knowledge_base"
    existing = {path.name for path in kb_dir.glob("*.json")}
    missing = REQUIRED_KB_FILES - existing
    if missing:
        missing_list = ", ".join(sorted(missing))
        raise RuntimeError(f"Missing required knowledge base files: {missing_list}")
