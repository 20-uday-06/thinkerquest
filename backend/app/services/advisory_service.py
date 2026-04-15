from datetime import datetime, timedelta, timezone
import re

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ConversationLog
from app.services.llm_service import generate_with_gemini
from app.services.profile_service import get_or_create_profile
from app.services.weather_service import get_weather_context

settings = get_settings()


def _contains_token(text: str, token: str) -> bool:
    if not token:
        return False

    if token.isascii() and any(ch.isalnum() for ch in token):
        pattern = rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])"
        return re.search(pattern, text) is not None

    return token in text


def _contains_any_token(text: str, tokens: list[str]) -> bool:
    return any(_contains_token(text, token) for token in tokens)


def _normalize_role(role: str | None) -> str:
    value = (role or "").strip()
    return value if value in {"किसान", "छात्र", "मजदूर"} else "किसान"


def _is_detail_query(query_text: str) -> bool:
    text = query_text.strip().lower()
    if len(text) >= 80:
        return True

    detail_tokens = [
        "detail",
        "detailed",
        "step",
        "steps",
        "how to",
        "कदम",
        "विस्तार",
        "पूरा",
        "पूरी",
        "plan",
        "roadmap",
    ]
    return _contains_any_token(text, detail_tokens)


def _needs_today_weather_context(query_text: str) -> bool:
    text = query_text.strip().lower()

    weather_tokens = [
        "मौसम",
        "weather",
        "mausam",
        "तापमान",
        "temperature",
        "temp",
        "humidity",
        "rain",
        "rainfall",
        "बारिश",
        "barish",
    ]
    irrigation_tokens = [
        "सिंचाई",
        "sinchai",
        "irrigation",
        "irrigigate",
        "पानी",
        "water",
        "watering",
    ]
    today_tokens = [
        "आज",
        "आज का",
        "aaj",
        "today",
        "today's",
        "current",
        "abhi",
        "अभी",
        "now",
        "right now",
    ]
    quantity_tokens = ["कितना", "कितनी", "how much", "kitna", "kitni", "mm", "liter", "litre", "लीटर"]

    has_weather = _contains_any_token(text, weather_tokens)
    has_irrigation = _contains_any_token(text, irrigation_tokens)
    has_today = _contains_any_token(text, today_tokens)
    asks_quantity = _contains_any_token(text, quantity_tokens)

    # Always enrich irrigation or weather queries with latest weather context.
    if has_irrigation or has_weather:
        return True

    # Keep an explicit guard for quantity+today wording even if weather word is omitted.
    if has_today and asks_quantity:
        return True

    return False


def _resolve_profile_location(role: str, location: str, worker_location: str | None) -> str:
    if role == "मजदूर" and worker_location and worker_location.strip():
        return worker_location.strip()
    return (location or "").strip() or "उत्तराखंड"


def _build_profile_context_text(profile) -> str:
    role = _normalize_role(profile.role)
    profile_location = _resolve_profile_location(role, profile.location, profile.worker_location)
    parts = [f"भूमिका: {role}", f"स्थान: {profile_location}"]

    if profile.name:
        parts.append(f"नाम: {profile.name}")

    if role == "किसान":
        crop = (profile.crop_preference or "").strip() or "सामान्य"
        parts.append(f"फसल रुचि: {crop}")
        parts.append(f"जमीन: {profile.land_size_acre:.2f} एकड़")
        if profile.farm_type:
            parts.append(f"फार्म प्रकार: {profile.farm_type}")
    elif role == "छात्र":
        if profile.field_of_study:
            parts.append(f"अध्ययन क्षेत्र: {profile.field_of_study}")
        if profile.interest_area:
            parts.append(f"रुचि क्षेत्र: {profile.interest_area}")
    elif role == "मजदूर":
        if profile.skill:
            parts.append(f"कौशल: {profile.skill}")

    return " | ".join(parts)


def _build_weather_context_text(location: str, weather: dict) -> str:
    temperature_c = float(weather.get("temperature_c", 0.0))
    precipitation_mm = float(weather.get("precipitation_mm", 0.0))
    source = str(weather.get("source", "weather"))
    observed_at = str(weather.get("observed_at", ""))
    weather_timezone = str(weather.get("timezone", "UTC"))
    fresh = bool(weather.get("fresh", False))

    source_label = {
        "live_open_meteo": "लाइव मौसम",
        "cached_weather_fresh": "कैश्ड मौसम (ताज़ा)",
        "cached_weather_stale": "कैश्ड मौसम (पुराना)",
        "cached_weather": "कैश्ड मौसम",
        "offline_default": "ऑफलाइन मौसम",
    }.get(source, source)

    freshness_label = "ताज़ा" if fresh else "संभवतः पुराना"
    observed_segment = f", अवलोकन समय: {observed_at} ({weather_timezone})" if observed_at else ""

    return (
        f"स्थान {location} का मौसम: तापमान {temperature_c:.1f}°C, वर्षा {precipitation_mm:.1f} mm, स्रोत: {source_label}, डेटा-स्थिति: {freshness_label}{observed_segment}।"
    )


def _build_runtime_context_text(profile_location: str, weather: dict | None) -> str:
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(timezone(timedelta(hours=5, minutes=30)))

    segments = [
        f"वर्तमान UTC समय: {now_utc.isoformat()}",
        f"वर्तमान IST समय: {now_ist.isoformat()}",
        f"प्रोफाइल स्थान: {profile_location}",
    ]

    if weather is not None:
        observed_at = str(weather.get("observed_at", "")).strip()
        if observed_at:
            segments.append(f"मौसम अवलोकन समय: {observed_at}")
        segments.append(f"मौसम समय-क्षेत्र: {str(weather.get('timezone', 'UTC'))}")

    # Demo hard-context requested by user for hackathon recording consistency.
    segments.append("डेमो निश्चित संदर्भ: आज 15 अप्रैल 2026 है")
    segments.append("डेमो मौसम संदर्भ: तापमान 22°C")

    return " | ".join(segments)


def _build_system_instruction(has_weather_context: bool, runtime_context: str) -> str:
    weather_rule = (
        "दिए गए मौसम संदर्भ को उत्तर में लागू करें, खासकर सिंचाई/पानी/फसल निर्णय में।"
        if has_weather_context
        else "यदि प्रश्न मौसम-आधारित हो और मौसम डेटा न हो तो अनुमान स्पष्ट रूप से बताकर सुरक्षित सलाह दें।"
    )

    return (
        "आप एक हिंदी ग्रामीण सहायक हैं। "
        "हर जवाब हिंदी में दें और बहुत विस्तृत, step-by-step, और व्यावहारिक रखें। "
        "जहां उचित हो, 8-12 बिंदुओं में structured उत्तर दें। "
        "अनावश्यक प्रस्तावना/डिस्क्लेमर/ऑफ-टॉपिक बातें न जोड़ें। "
        "जो पूछा गया है उसी का विस्तृत, स्पष्ट और व्यावहारिक उत्तर दें। "
        "अगर मात्रा पूछी गई हो तो स्पष्ट इकाइयों के साथ बताएं। "
        "अंत में 1 छोटा actionable next step अवश्य दें। "
        "दिए गए समय-संदर्भ और मौसम-संदर्भ को authoritative मानें; पुरानी/कल्पित तारीख या अलग स्थान का मौसम न बताएं। "
        f"रनटाइम संदर्भ: {runtime_context} "
        f"{weather_rule}"
    )


def _build_llm_prompt(
    query_text: str,
    profile_context: str,
    weather_context: str,
    runtime_context: str,
) -> str:
    weather_line = weather_context if weather_context else "मौसम संदर्भ: लागू नहीं"

    return (
        f"उपयोगकर्ता प्रश्न: {query_text}\n"
        f"प्रोफाइल संदर्भ: {profile_context}\n"
        f"रनटाइम संदर्भ: {runtime_context}\n"
        f"मौसम संदर्भ: {weather_line}\n\n"
        "उत्तर निर्देश:\n"
        "1) सीधे मुख्य उत्तर से शुरू करें, प्रस्तावना नहीं।\n"
        "2) जवाब हिंदी में, लंबा, गहरा और practical दें।\n"
        "3) 8-12 स्पष्ट बुलेट/क्रमबद्ध बिंदु दें।\n"
        "4) मौसम/सिंचाई सवाल में दिए गए मौसम संदर्भ का ही उपयोग करें।\n"
        "5) मात्रा/डोज/समय में units (mm, लीटर/एकड़, दिन/समय) स्पष्ट लिखें।\n"
        "6) अंत में 'अगला कदम:' शीर्षक के साथ 1 actionable step दें।"
    )


def _looks_incomplete_answer(answer: str) -> bool:
    text = answer.strip()
    if not text:
        return True

    if re.search(r"[.!?।]\s*$", text):
        return False

    # Non-terminated endings frequently indicate clipped Gemini output.
    return True


def _looks_too_brief(answer: str) -> bool:
    text = answer.strip()
    if not text:
        return True

    # Demo requirement: keep answers detailed, not one short paragraph.
    return len(text) < 420


def _looks_structurally_truncated(answer: str) -> bool:
    text = answer.strip()
    if not text:
        return True

    # Common clipped endings observed in generated markdown-like responses.
    if re.search(r"\n\s*\d+\.\s*$", text):
        return True

    # Unbalanced markdown bold markers often indicate clipped output.
    if text.count("**") % 2 == 1:
        return True

    return False


def _build_completion_prompt(
    query_text: str,
    profile_context: str,
    weather_context: str,
    runtime_context: str,
    partial_answer: str,
) -> str:
    weather_line = weather_context if weather_context else "मौसम संदर्भ: लागू नहीं"

    return (
        "नीचे दिया गया उत्तर अधूरा कट गया था। उसी प्रश्न का पूरा, अंतिम और समापन वाला जवाब दें।\n\n"
        f"उपयोगकर्ता प्रश्न: {query_text}\n"
        f"प्रोफाइल संदर्भ: {profile_context}\n"
        f"रनटाइम संदर्भ: {runtime_context}\n"
        f"मौसम संदर्भ: {weather_line}\n"
        f"अधूरा ड्राफ्ट: {partial_answer}\n\n"
        "निर्देश:\n"
        "1) पूरा उत्तर स्पष्ट बिंदुओं में दें।\n"
        "2) अगर सिंचाई/मौसम प्रश्न हो तो मात्रा, समय और सावधानी जरूर दें।\n"
        "3) सीधा उत्तर दें, प्रस्तावना/डिस्क्लेमर/अतिरिक्त विषय न जोड़ें।\n"
        "4) हर वाक्य पूरा लिखें और जवाब अधूरा न छोड़ें।"
    )


def _build_expansion_prompt(
    query_text: str,
    profile_context: str,
    weather_context: str,
    runtime_context: str,
    short_answer: str,
) -> str:
    weather_line = weather_context if weather_context else "मौसम संदर्भ: लागू नहीं"

    return (
        "नीचे दिया गया जवाब बहुत छोटा है। उसी जवाब को अब विस्तृत, उपयोगी और पूर्ण बनाएं।\n\n"
        f"उपयोगकर्ता प्रश्न: {query_text}\n"
        f"प्रोफाइल संदर्भ: {profile_context}\n"
        f"रनटाइम संदर्भ: {runtime_context}\n"
        f"मौसम संदर्भ: {weather_line}\n"
        f"छोटा ड्राफ्ट: {short_answer}\n\n"
        "निर्देश:\n"
        "1) 8-12 स्पष्ट बिंदुओं में विस्तार से जवाब दें।\n"
        "2) व्यावहारिक कदम, सावधानियां, और समय-आधारित guidance शामिल करें।\n"
        "3) अगर लागू हो तो मात्रा/डोज/यूनिट स्पष्ट लिखें।\n"
        "4) अंत में 'अगला कदम:' लिखकर एक actionable step दें।"
    )


def _is_gemini_key(value: str | None) -> bool:
    text = (value or "").strip()
    return text.startswith("AIza")


def _candidate_gemini_keys() -> list[str]:
    # Try multiple Google keys if available to reduce 429 impact.
    raw = [settings.google_api_key, settings.google_tts_api_key, settings.llm_api_key]
    keys: list[str] = []
    for item in raw:
        value = (item or "").strip()
        if not value or not _is_gemini_key(value):
            continue
        if value not in keys:
            keys.append(value)
    return keys


def _estimate_irrigation_mm(weather: dict) -> tuple[float, float]:
    temp_c = float(weather.get("temperature_c", 0.0))
    rain_mm = float(weather.get("precipitation_mm", 0.0))

    if rain_mm >= 2.0:
        return (0.0, 2.0)
    if temp_c >= 34.0:
        return (8.0, 10.0)
    if temp_c <= 10.0:
        return (2.0, 4.0)
    return (5.0, 7.0)


def _build_simple_fallback_answer(
    *,
    query_text: str,
    crop_preference: str,
    profile_location: str,
    land_size_acre: float,
    weather: dict | None,
) -> str:
    if weather is not None and _needs_today_weather_context(query_text):
        temp_c = float(weather.get("temperature_c", 0.0))
        rain_mm = float(weather.get("precipitation_mm", 0.0))
        low_mm, high_mm = _estimate_irrigation_mm(weather)
        liters_per_acre_low = low_mm * 4046.86
        liters_per_acre_high = high_mm * 4046.86
        total_low = liters_per_acre_low * max(land_size_acre, 1.0)
        total_high = liters_per_acre_high * max(land_size_acre, 1.0)
        return (
            f"आज {profile_location} में तापमान {temp_c:.1f}°C और वर्षा {rain_mm:.1f} mm है।\n"
            f"आज सिंचाई अनुमान: {low_mm:.0f}-{high_mm:.0f} mm।\n"
            f"लगभग {liters_per_acre_low:.0f}-{liters_per_acre_high:.0f} लीटर/एकड़ पानी दें।\n"
            f"कुल जमीन के लिए अनुमानित पानी: {total_low:.0f}-{total_high:.0f} लीटर।\n"
            "सुबह या शाम सिंचाई करें और खेत की वास्तविक नमी देखकर अंतिम मात्रा तय करें।"
        )

    return _build_detailed_local_answer(
        query_text=query_text,
        crop_preference=crop_preference,
    )


def _build_detailed_local_answer(query_text: str, crop_preference: str) -> str:
    text = query_text.strip().lower()
    crop = crop_preference or "फसल"

    if _contains_any_token(text, ["फसल", "गेहूं", "खराब", "रोग", "कीट", "storage", "भंडारण"]):
        return (
            f"आपकी {crop} फसल को खराब होने से बचाने के लिए विस्तृत कार्ययोजना:\n"
            "1. खेत में पानी का ठहराव न होने दें; निकास नालियां साफ रखें।\n"
            "2. पत्तियों/बालियों की 2-3 दिन पर निगरानी करें; रोग/कीट के शुरुआती लक्षण तुरंत पहचानें।\n"
            "3. रोगग्रस्त हिस्सों को अलग करें और खेत में संतुलित पोषण बनाए रखें।\n"
            "4. सिंचाई सुबह/शाम करें और मिट्टी की नमी देखकर मात्रा तय करें।\n"
            "5. कटाई सही नमी स्तर पर करें; बहुत देर से कटाई न करें।\n"
            "6. कटाई के बाद दानों को अच्छी तरह सुखाकर ही भंडारण करें।\n"
            "7. भंडारण स्थान सूखा, हवादार और कीट-मुक्त रखें; बोरी/बिन को साफ रखें।\n"
            "8. हर सप्ताह भंडारित अनाज की जांच करें और नमी/कीट दिखते ही सुधारात्मक कदम लें।\n"
            "अगला कदम: खेत की वर्तमान अवस्था (कटाई से पहले/बाद) बताएं, मैं stage-wise सटीक योजना दूंगा।"
        )

    return (
        "विस्तृत उत्तर के लिए कृपया प्रश्न में फसल, स्थान, और समस्या (रोग/कीट/सिंचाई/खाद) स्पष्ट लिखें।\n"
        "अगला कदम: उदाहरण के लिए पूछें - 'मेरी 2 एकड़ गेहूं में इस समय रोग से बचाव की पूरी योजना बताओ'।"
    )


def generate_advisory(db: Session, query_text: str) -> dict:
    profile = get_or_create_profile(db)
    profile_role = _normalize_role(profile.role)
    profile_location = _resolve_profile_location(
        role=profile_role,
        location=profile.location,
        worker_location=profile.worker_location,
    )
    profile_context = _build_profile_context_text(profile)

    needs_weather = _needs_today_weather_context(query_text)
    weather_context = ""
    sources: list[str] = []
    mode = "gemini_direct"

    weather: dict | None = None
    if needs_weather:
        weather = get_weather_context(db=db, location=profile_location)
        weather_context = _build_weather_context_text(location=profile_location, weather=weather)
        sources.append(str(weather.get("source", "weather")))
        mode = "gemini_with_weather_context"

    runtime_context = _build_runtime_context_text(profile_location=profile_location, weather=weather)
    gemini_keys = _candidate_gemini_keys()

    if not settings.enable_llm or not gemini_keys:
        answer = _build_simple_fallback_answer(
            query_text=query_text,
            crop_preference=(profile.crop_preference or "").strip(),
            profile_location=profile_location,
            land_size_acre=profile.land_size_acre,
            weather=weather,
        )
        mode = f"{mode}_fallback_no_gemini_key"
        sources.extend(["gemini_api_unavailable", "simple_fallback"])
    else:
        llm_system_instruction = _build_system_instruction(
            has_weather_context=needs_weather,
            runtime_context=runtime_context,
        )
        llm_detailed = True
        answer = ""
        last_error: Exception | None = None

        try:
            used_key = ""
            for key in gemini_keys:
                try:
                    answer = generate_with_gemini(
                        api_key=key,
                        prompt=_build_llm_prompt(
                            query_text=query_text,
                            profile_context=profile_context,
                            weather_context=weather_context,
                            runtime_context=runtime_context,
                        ),
                        detailed=llm_detailed,
                        system_instruction=llm_system_instruction,
                    )
                    used_key = key
                    break
                except Exception as exc:
                    last_error = exc

            if not answer:
                raise RuntimeError(f"Gemini all keys failed: {last_error}")

            if _looks_incomplete_answer(answer):
                try:
                    answer = generate_with_gemini(
                        api_key=used_key,
                        prompt=_build_completion_prompt(
                            query_text=query_text,
                            profile_context=profile_context,
                            weather_context=weather_context,
                            runtime_context=runtime_context,
                            partial_answer=answer,
                        ),
                        detailed=True,
                        system_instruction=llm_system_instruction,
                    )
                except Exception:
                    # Keep first draft if completion pass fails.
                    pass

            if _looks_too_brief(answer) or _looks_structurally_truncated(answer):
                try:
                    answer = generate_with_gemini(
                        api_key=used_key,
                        prompt=_build_expansion_prompt(
                            query_text=query_text,
                            profile_context=profile_context,
                            weather_context=weather_context,
                            runtime_context=runtime_context,
                            short_answer=answer,
                        ),
                        detailed=True,
                        system_instruction=llm_system_instruction,
                    )
                except Exception:
                    # Keep earlier answer if expansion fails.
                    pass

            if _looks_incomplete_answer(answer):
                answer = f"{answer.rstrip()}।"

            if _looks_too_brief(answer) or _looks_structurally_truncated(answer):
                answer = _build_detailed_local_answer(
                    query_text=query_text,
                    crop_preference=(profile.crop_preference or "").strip(),
                )
                mode = f"{mode}_detail_guard"
                sources.append("local_detail_guard")

            sources.append("gemini_api")
        except Exception:
            answer = _build_simple_fallback_answer(
                query_text=query_text,
                crop_preference=(profile.crop_preference or "").strip(),
                profile_location=profile_location,
                land_size_acre=profile.land_size_acre,
                weather=weather,
            )
            mode = f"{mode}_fallback_after_gemini_error"
            sources.extend(["gemini_api_error", "simple_fallback"])

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
        "sources": sorted(set(sources)),
    }