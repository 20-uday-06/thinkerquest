from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ConversationLog
from app.services.knowledge_service import retrieve_facts
from app.services.profile_service import get_or_create_profile
from app.services.weather_service import get_weather_context

settings = get_settings()


def _simple_rule_reply(query_text: str, location: str, crop: str) -> tuple[str, list[str]]:
    text = query_text.strip().lower()

    if "बुवाई" in text or "sowing" in text:
        return (
            f"{location} में {crop} की बुवाई आमतौर पर अक्टूबर से नवंबर के बीच करें। मिट्टी में नमी हो तो अंकुरण अच्छा होगा।",
            ["crop_calendar_uttarakhand.json"],
        )
    if "खाद" in text or "fertilizer" in text:
        return (
            f"{crop} के लिए नाइट्रोजन, फॉस्फोरस और पोटाश संतुलित मात्रा में दें। अपनी ज़मीन की जांच रिपोर्ट हो तो उसी के अनुसार मात्रा तय करें।",
            ["fertilizer_basics_north_india.json"],
        )
    if "मौसम" in text or "weather" in text:
        return (
            f"अगर अगले 24 घंटों में बारिश की संभावना हो तो सिंचाई टालें। {location} के लिए खेत में नमी देखकर ही पानी दें।",
            ["weather_rules_general.json"],
        )
    if "फसल" in text or "crop" in text:
        return (
            f"{location} और आपकी पसंद {crop} को देखते हुए अभी रबी सीजन की तैयारी रखें। खेत की जुताई और बीज उपचार पहले करें।",
            ["crop_selection_north_india.json"],
        )

    return (
        "कृपया फसल, बुवाई, खाद या मौसम से जुड़ा सवाल पूछें। मैं आसान कृषि सलाह दूंगा।",
        ["domain_guardrail"],
    )


def _build_retrieval_summary(
    query_text: str, crop: str, location: str, weather_tokens: list[str]
) -> tuple[str, list[str]]:
    facts = retrieve_facts(
        query_text,
        boost_terms=[crop, location, *weather_tokens],
    )
    if not facts:
        return "", []

    lines: list[str] = []
    sources: list[str] = []

    for fact in facts:
        sources.append(fact.source)
        content = fact.content
        if "sowing_window" in content:
            lines.append(f"{content.get('crop', crop)} की बुवाई अवधि: {content['sowing_window']}।")
        elif "guidance" in content:
            lines.append(f"खाद सलाह: {content['guidance']}।")
        elif "advice" in content:
            lines.append(f"मौसम सलाह: {content['advice']}।")
        elif "recommended_crops" in content:
            crops = ", ".join(content["recommended_crops"])
            lines.append(f"मौसम के अनुसार उपयुक्त फसलें: {crops}।")

    unique_sources = sorted(set(sources))
    summary = " ".join(lines[:2]).strip()
    return summary, unique_sources


def _build_weather_advice(weather: dict) -> str:
    temperature_c = weather.get("temperature_c", 0.0)
    precipitation_mm = weather.get("precipitation_mm", 0.0)

    if precipitation_mm >= 1.0:
        return "अभी वर्षा/नमी दिख रही है, इसलिए सिंचाई रोकें और खेत का जल निकास देखें।"
    if temperature_c >= 34:
        return "तापमान अधिक है, सिंचाई सुबह या शाम करें और दोपहर में पानी न दें।"
    if temperature_c <= 8:
        return "ठंड अधिक है, हल्की सिंचाई शाम में करें और कोमल पौधों की सुरक्षा करें।"
    return "मौसम सामान्य है, सिंचाई मिट्टी की नमी देखकर करें।"


def generate_advisory(db: Session, query_text: str) -> dict:
    profile = get_or_create_profile(db)
    weather = get_weather_context(db=db, location=profile.location)
    weather_tokens = ["बारिश" if weather.get("precipitation_mm", 0.0) > 0 else "शुष्क"]

    base_answer, sources = _simple_rule_reply(
        query_text=query_text,
        location=profile.location,
        crop=profile.crop_preference,
    )

    retrieval_summary, retrieval_sources = _build_retrieval_summary(
        query_text=query_text,
        crop=profile.crop_preference,
        location=profile.location,
        weather_tokens=weather_tokens,
    )

    weather_line = _build_weather_advice(weather)

    if retrieval_summary:
        answer = (
            f"आपका स्थान: {profile.location}, जमीन: {profile.land_size_acre} एकड़, पसंदीदा फसल: {profile.crop_preference}। "
            f"{base_answer} {retrieval_summary} मौसम स्थिति: {weather_line}"
        )
        sources = sorted(set(sources + retrieval_sources + [str(weather.get("source", "weather"))]))
    else:
        answer = (
            f"आपका स्थान: {profile.location}, जमीन: {profile.land_size_acre} एकड़, पसंदीदा फसल: {profile.crop_preference}। "
            f"{base_answer} मौसम स्थिति: {weather_line}"
        )
        sources = sorted(set(sources + [str(weather.get("source", "weather"))]))

    mode = "hybrid_rule_retrieval"
    if settings.enable_llm and settings.openai_api_key:
        mode = "hybrid_llm_ready"

    log = ConversationLog(
        user_query=query_text,
        assistant_response=answer,
        mode=mode,
    )
    db.add(log)
    db.commit()

    return {
        "answer": answer,
        "mode": mode,
        "language": "hi",
        "generated_at": datetime.now(timezone.utc),
        "sources": sources,
    }
