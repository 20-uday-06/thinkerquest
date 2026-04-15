from datetime import datetime, timedelta, timezone
import re

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ConversationLog
from app.services.knowledge_service import RetrievedFact, retrieve_facts
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

    return " | ".join(segments)


def _build_system_instruction(has_weather_context: bool, runtime_context: str) -> str:
    weather_rule = (
        "दिए गए मौसम संदर्भ को उत्तर में लागू करें, खासकर सिंचाई/पानी/फसल निर्णय में।"
        if has_weather_context
        else "यदि प्रश्न मौसम-आधारित हो और मौसम डेटा न हो तो अनुमान स्पष्ट रूप से बताकर सुरक्षित सलाह दें।"
    )

    return (
        "आप एक हिंदी-प्रथम ग्रामीण सहायक हैं। "
        "हर प्रश्न का सीधा, उपयोगी और व्यावहारिक विस्तृत उत्तर दें। "
        "प्रोफाइल संदर्भ का उपयोग करें और उत्तर को उपयोगकर्ता की स्थिति के अनुसार व्यक्तिगत बनाएं। "
        "बिना प्रमाण के दावे, नकली लिंक, या मनगढ़ंत तथ्य न दें। "
        "सरकारी/नीति जानकारी में नियम बदलने की संभावना का संकेत दें। "
        "जवाब सरल हिंदी में दें; जरूरत हो तो छोटे अंग्रेजी शब्द जोड़ सकते हैं। "
        "उत्तर में भूमिका परिचय, अनावश्यक प्रस्तावना, या अतिरिक्त विषय न जोड़ें; जो पूछा गया है उसी का उत्तर दें। "
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
        "1) सीधे मुख्य उत्तर से शुरू करें, कोई प्रस्तावना न दें।\n"
        "2) 4-8 स्पष्ट बिंदुओं में विस्तृत लेकिन केवल-प्रासंगिक उत्तर दें।\n"
        "3) अगर मात्रा/संख्या हो तो स्पष्ट इकाइयों के साथ लिखें।\n"
        "4) अगर सवाल मौसम/सिंचाई का है, तो ऊपर दिए गए स्थान और समय वाले मौसम डेटा का ही उपयोग करें।\n"
        "5) जो नहीं पूछा गया है वह अतिरिक्त जानकारी न जोड़ें।"
    )


def _looks_incomplete_answer(answer: str) -> bool:
    text = answer.strip()
    if not text:
        return True

    if re.search(r"[.!?।]\s*$", text):
        return False

    # Non-terminated endings frequently indicate clipped Gemini output.
    return True


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
        "1) पूरा उत्तर 5-8 स्पष्ट बिंदुओं में दें।\n"
        "2) अगर सिंचाई/मौसम प्रश्न हो तो मात्रा, समय और सावधानी जरूर दें।\n"
        "3) सीधा उत्तर दें, प्रस्तावना/डिस्क्लेमर/अतिरिक्त विषय न जोड़ें।\n"
        "4) हर वाक्य पूरा लिखें और जवाब अधूरा न छोड़ें।"
    )


def _to_text_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _weather_rule_fallback(weather: dict) -> str:
    temperature_c = float(weather.get("temperature_c", 0.0))
    precipitation_mm = float(weather.get("precipitation_mm", 0.0))

    if precipitation_mm >= 2.0:
        return "बारिश संकेत होने से अभी सिंचाई टालें और 6-12 घंटे बाद खेत की नमी देखकर निर्णय लें।"
    if temperature_c >= 34.0:
        return "गर्मी अधिक है, इसलिए सिंचाई केवल सुबह जल्दी या शाम को करें; दोपहर की सिंचाई से बचें।"
    if temperature_c <= 10.0:
        return "तापमान कम है, हल्की सिंचाई शाम में करें और कोमल पौधों को ठंड से सुरक्षा दें।"
    return "हल्की से मध्यम सिंचाई सुबह/शाम करें और खेत की वास्तविक नमी देखकर मात्रा तय करें।"


def _format_fact_line(fact: RetrievedFact) -> str | None:
    record = fact.content

    if "advice" in record:
        condition = str(record.get("condition", "मौसम स्थिति"))
        advice = str(record.get("advice", ""))
        if advice:
            return f"{condition}: {advice}"

    if "sowing_window" in record:
        crop = str(record.get("crop", "फसल"))
        sowing = str(record.get("sowing_window", ""))
        harvest = str(record.get("harvest_window", ""))
        tips = _to_text_list(record.get("tips"))
        tip_text = f"; टिप: {tips[0]}" if tips else ""
        return f"{crop}: बुवाई {sowing}, कटाई {harvest}{tip_text}".strip()

    if "recommended_crops" in record:
        season = str(record.get("season", ""))
        region = str(record.get("region", ""))
        crops = ", ".join(_to_text_list(record.get("recommended_crops")))
        basis = str(record.get("basis", ""))
        return f"{season} ({region}) के लिए उपयुक्त फसलें: {crops}; आधार: {basis}".strip()

    if "guidance" in record:
        crop = str(record.get("crop", "सामान्य"))
        guidance = str(record.get("guidance", ""))
        split = str(record.get("split_application", ""))
        notes = _to_text_list(record.get("notes"))
        note_text = f"; नोट: {notes[0]}" if notes else ""
        return f"{crop}: {guidance}; {split}{note_text}".strip()

    # Generic fallback for any unexpected KB record shape.
    chunks: list[str] = []
    for key, value in record.items():
        values = ", ".join(_to_text_list(value)) if isinstance(value, list) else str(value)
        if values.strip():
            chunks.append(f"{key}: {values}")
    if chunks:
        return "; ".join(chunks[:3])
    return None


def _generic_rule_lines(query_text: str, role: str) -> list[str]:
    text = query_text.strip().lower()

    irrigation_tokens = ["सिंचाई", "sinchai", "irrigation", "पानी", "water", "watering"]
    fertilizer_tokens = ["खाद", "उर्वरक", "fertilizer", "npk", "यूरिया", "urea"]
    crop_tokens = ["फसल", "crop", "बुवाई", "sowing", "कौन सी", "recommended"]

    if _contains_any_token(text, irrigation_tokens):
        return [
            "मिट्टी की ऊपरी परत नहीं, बल्कि 5-7 सेमी गहराई की नमी देखकर सिंचाई करें।",
            "सुबह/शाम सिंचाई करें और तेज धूप के समय पानी न दें।",
            "एक साथ ज्यादा पानी देने के बजाय आवश्यकता अनुसार चरणों में सिंचाई करें।",
        ]

    if _contains_any_token(text, fertilizer_tokens):
        return [
            "खाद/उर्वरक की मात्रा मिट्टी जांच के आधार पर तय करना सबसे सुरक्षित रहता है।",
            "नाइट्रोजन आधारित खाद को 2-3 किस्तों में देना अधिक प्रभावी होता है।",
            "अत्यधिक यूरिया से फसल गिरने और लागत बढ़ने का जोखिम रहता है।",
        ]

    if _contains_any_token(text, crop_tokens):
        return [
            "फसल चयन में मौसम, पानी की उपलब्धता और स्थानीय बाजार मांग तीनों देखें।",
            "अपने क्षेत्र के अनुकूल बीज/किस्म चुनें और समय पर बुवाई करें।",
            "एक ही फसल पर निर्भर रहने के बजाय जोखिम कम करने हेतु विविधता रखें।",
        ]

    if role == "मजदूर":
        return [
            "काम से पहले सुरक्षा (दस्ताने/जूते/मास्क) का उपयोग करें।",
            "दिन का काम मौसम और उपलब्ध उपकरण देखकर चरणों में प्लान करें।",
            "अगर कार्य कृषि से जुड़ा है, तो खेत की नमी और मौसम के अनुसार समय तय करें।",
        ]

    if role == "छात्र":
        return [
            "उत्तर को स्थानीय उदाहरण से जोड़कर नोट्स बनाएं ताकि याद रखना आसान हो।",
            "मौसम, मिट्टी और फसल स्टेज को साथ में देखकर निर्णय लेना सीखें।",
            "एक छोटा field-observation checklist बनाकर उसी से अभ्यास करें।",
        ]

    return [
        "निर्णय लेते समय मौसम, जमीन की स्थिति और उपलब्ध संसाधनों को साथ में देखें।",
        "छोटे-छोटे कदमों में काम करें और हर चरण का परिणाम नोट करें।",
        "जरूरत हो तो मैं आपकी स्थिति के हिसाब से और सटीक, चरणबद्ध योजना दे सकता हूँ।",
    ]


def _build_rule_based_fallback_answer(
    *,
    query_text: str,
    profile_role: str,
    profile_location: str,
    crop_preference: str,
    weather: dict | None,
    weather_context: str,
    retrieved_facts: list[RetrievedFact],
) -> str:
    lines: list[str] = []

    if weather_context:
        lines.append(weather_context)

    fact_lines = [line for line in (_format_fact_line(fact) for fact in retrieved_facts) if line]
    if fact_lines:
        for idx, fact_line in enumerate(fact_lines[:3], start=1):
            lines.append(f"{idx}. {fact_line}")
    else:
        for idx, item in enumerate(_generic_rule_lines(query_text=query_text, role=profile_role), start=1):
            lines.append(f"{idx}. {item}")

    if weather is not None:
        lines.append(f"मौसम-आधारित सावधानी: {_weather_rule_fallback(weather)}")
    return "\n".join(lines)


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

    boost_terms = [profile_location]
    if profile.crop_preference:
        boost_terms.append(profile.crop_preference)
    retrieved_facts = retrieve_facts(query=query_text, top_k=3, boost_terms=boost_terms)
    kb_sources = sorted({fact.source for fact in retrieved_facts})
    runtime_context = _build_runtime_context_text(profile_location=profile_location, weather=weather)

    if not settings.enable_llm or not settings.llm_api_key:
        answer = _build_rule_based_fallback_answer(
            query_text=query_text,
            profile_role=profile_role,
            profile_location=profile_location,
            crop_preference=(profile.crop_preference or "").strip(),
            weather=weather,
            weather_context=weather_context,
            retrieved_facts=retrieved_facts,
        )
        mode = f"{mode}_fallback_no_llm"
        sources.extend(["gemini_api_unavailable", "rule_based_fallback", *kb_sources])
    else:
        llm_system_instruction = _build_system_instruction(
            has_weather_context=needs_weather,
            runtime_context=runtime_context,
        )
        llm_detailed = True
        try:
            answer = generate_with_gemini(
                api_key=settings.llm_api_key,
                prompt=_build_llm_prompt(
                    query_text=query_text,
                    profile_context=profile_context,
                    weather_context=weather_context,
                    runtime_context=runtime_context,
                ),
                detailed=llm_detailed,
                system_instruction=llm_system_instruction,
            )

            if _looks_incomplete_answer(answer):
                try:
                    answer = generate_with_gemini(
                        api_key=settings.llm_api_key,
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

            if _looks_incomplete_answer(answer):
                answer = f"{answer.rstrip()}।"

            sources.append("gemini_api")
        except Exception:
            answer = _build_rule_based_fallback_answer(
                query_text=query_text,
                profile_role=profile_role,
                profile_location=profile_location,
                crop_preference=(profile.crop_preference or "").strip(),
                weather=weather,
                weather_context=weather_context,
                retrieved_facts=retrieved_facts,
            )
            mode = f"{mode}_fallback_after_gemini_error"
            sources.extend(["gemini_api_error", "rule_based_fallback", *kb_sources])

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