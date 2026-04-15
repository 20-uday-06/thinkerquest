from datetime import datetime, timezone
import re

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ConversationLog
from app.services.knowledge_service import retrieve_facts
from app.services.llm_service import generate_with_gemini
from app.services.profile_service import get_or_create_profile
from app.services.weather_service import get_weather_context

settings = get_settings()


def _contains_token(text: str, token: str) -> bool:
    if not token:
        return False

    # Use word boundaries for Latin tokens to avoid false positives such as "hi" in "nahi".
    if token.isascii() and any(ch.isalnum() for ch in token):
        pattern = rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])"
        return re.search(pattern, text) is not None

    return token in text


def _contains_any_token(text: str, tokens: list[str]) -> bool:
    return any(_contains_token(text, token) for token in tokens)


def _normalize_role(role: str | None) -> str:
    value = (role or "").strip()
    return value if value in {"किसान", "छात्र", "मजदूर"} else "किसान"


def _is_agri_query(text: str) -> bool:
    agri_tokens = [
        "फसल",
        "बुवाई",
        "खाद",
        "मौसम",
        "सिंचाई",
        "पैदावार",
        "पानी",
        "crop",
        "sowing",
        "fertilizer",
        "fertiliser",
        "weather",
        "irrigation",
        "irrigigation",
        "yield",
        "fasal",
        "buwai",
        "bowai",
        "khad",
        "khaad",
        "mausam",
        "sinchai",
        "pani",
        "paani",
        "paidavar",
        "barish",
        "rain",
        "npk",
        "n-p-k",
        "n p k",
        "एनपीके",
        "kvk",
        "k.v.k",
        "कृषि विज्ञान केंद्र",
        "urea",
        "dap",
        "potash",
        "nitrogen",
        "phosphorus",
        "potassium",
        "nutrient",
        "dosage",
        "dose",
        "soil test",
        "soil testing",
        "ph",
        "grow",
        "growing",
        "growth",
        "not growing",
        "ग्रोइंग",
        "ग्रोथ",
        "पौधा",
        "plant",
        "stunted",
        "yellow leaf",
        "पीला",
        "कम बढ़",
    ]
    return _contains_any_token(text, agri_tokens)


def _is_irrigation_quantity_query(text: str) -> bool:
    irrigation_tokens = [
        "सिंचाई",
        "पानी",
        "water",
        "irrigation",
        "irrigigation",
        "sinchai",
        "pani",
        "paani",
    ]
    quantity_tokens = [
        "मात्रा",
        "कितना",
        "कितनी",
        "liter",
        "litre",
        "लीटर",
        "mm",
        "मिमी",
        "qty",
        "quantity",
        "kitna",
        "kitni",
        "how much",
        "liters",
        "ltr",
    ]
    weather_tokens = [
        "आज",
        "today",
        "todays",
        "aaj",
        "मौसम",
        "weather",
        "mausam",
        "बारिश",
        "barish",
        "rain",
    ]
    return _contains_any_token(text, irrigation_tokens) and (
        _contains_any_token(text, quantity_tokens)
        or _contains_any_token(text, weather_tokens)
    )


def _is_current_weather_query(text: str) -> bool:
    weather_tokens = [
        "मौसम",
        "weather",
        "mausam",
        "तापमान",
        "temperature",
        "temp",
        "humidity",
        "rainfall",
        "बारिश",
        "barish",
        "rain",
    ]
    current_tokens = [
        "आज",
        "आज का",
        "today",
        "todays",
        "aaj",
        "current",
        "abhi",
        "अभी",
        "now",
        "right now",
    ]
    return _contains_any_token(text, weather_tokens) and _contains_any_token(text, current_tokens)


def _is_crop_growth_issue_query(text: str) -> bool:
    growth_tokens = [
        "grow",
        "growing",
        "growth",
        "not growing",
        "growing well",
        "ग्रोइंग",
        "ग्रोथ",
        "नॉट ग्रोइंग",
        "बढ़ नहीं",
        "नहीं बढ़",
        "stunted",
        "weak plant",
        "yellow leaf",
        "पीला",
        "प्रॉब्लम",
        "problem",
    ]
    non_agri_growth_tokens = [
        "career",
        "job growth",
        "business growth",
        "study",
        "education",
        "skill",
        "salary",
        "promotion",
        "mental health",
    ]
    if _contains_any_token(text, non_agri_growth_tokens):
        return False

    return _contains_any_token(text, growth_tokens)


def _build_term_explanation_answer(query_text: str) -> tuple[str, list[str]] | None:
    text = query_text.strip().lower()
    has_npk = _contains_any_token(text, ["npk", "n-p-k", "n p k", "n.p.k", "एनपीके"])
    has_kvk = _contains_any_token(text, ["kvk", "k.v.k", "कृषि विज्ञान केंद्र"])

    if not has_npk and not has_kvk:
        return None

    lines: list[str] = []
    if has_npk:
        lines.append(
            "NPK का मतलब Nitrogen (N), Phosphorus (P), Potassium (K) है। N पत्तियों/वृद्धि के लिए, P जड़ और फूल-फल के लिए, K पौधे की मजबूती और रोग-सहनशीलता के लिए जरूरी है।"
        )
    if has_kvk:
        lines.append(
            "KVK का मतलब कृषि विज्ञान केंद्र है। यह किसानों को स्थानीय फसल सलाह, प्रशिक्षण, मिट्टी/कीट प्रबंधन मार्गदर्शन और नई तकनीक का प्रदर्शन देता है।"
        )

    lines.append("अगर चाहें तो मैं आपकी फसल और जमीन के अनुसार NPK की व्यावहारिक मात्रा भी बता सकता हूँ।")
    return " ".join(lines), ["agri_glossary"]


def _estimate_irrigation_mm_range(temperature_c: float, precipitation_mm: float) -> tuple[float, float, str]:
    if precipitation_mm >= 2.0:
        return 0.0, 0.0, "आज बारिश/नमी पर्याप्त है, इसलिए सिंचाई रोकें।"
    if precipitation_mm >= 0.5:
        return 1.0, 2.0, "हल्की वर्षा दर्ज हुई है, इसलिए सिर्फ हल्की टॉप-अप सिंचाई रखें।"
    if temperature_c >= 38:
        return 8.0, 10.0, "गर्मी बहुत अधिक है, फसल का पानी नुकसान तेजी से होगा।"
    if temperature_c >= 34:
        return 6.0, 8.0, "तापमान अधिक है, इसलिए सामान्य से थोड़ी ज्यादा सिंचाई रखें।"
    if temperature_c <= 10:
        return 1.0, 2.0, "ठंड में वाष्पीकरण कम रहता है, इसलिए हल्की सिंचाई पर्याप्त रहती है।"
    return 3.0, 5.0, "मौसम मध्यम है, इसलिए सामान्य सिंचाई मात्रा रखें।"


def _round_liters(value: float) -> int:
    # Round to nearest 100 liters for field-friendly guidance.
    return max(0, int(round(value / 100.0) * 100))


def _build_irrigation_quantity_answer(
    location: str,
    crop: str,
    land_size_acre: float,
    weather: dict,
) -> str:
    temperature_c = float(weather.get("temperature_c", 0.0))
    precipitation_mm = float(weather.get("precipitation_mm", 0.0))
    source = str(weather.get("source", "weather"))

    mm_min, mm_max, reason_line = _estimate_irrigation_mm_range(
        temperature_c=temperature_c,
        precipitation_mm=precipitation_mm,
    )

    effective_land_acre = land_size_acre if land_size_acre > 0 else 1.0
    liters_per_mm_per_acre = 4046.86
    per_acre_min_l = _round_liters(mm_min * liters_per_mm_per_acre)
    per_acre_max_l = _round_liters(mm_max * liters_per_mm_per_acre)
    total_min_l = _round_liters(mm_min * liters_per_mm_per_acre * effective_land_acre)
    total_max_l = _round_liters(mm_max * liters_per_mm_per_acre * effective_land_acre)

    source_label = "लाइव Open-Meteo" if source == "live_open_meteo" else "कैश्ड/ऑफलाइन मौसम"

    if mm_max == 0.0:
        quantity_line = "आज अनुशंसित सिंचाई: 0 mm (0 लीटर/एकड़)।"
        total_line = f"कुल खेत ({effective_land_acre:.2f} एकड़) के लिए: 0 लीटर।"
    else:
        quantity_line = (
            f"आज अनुशंसित सिंचाई: {mm_min:.1f}-{mm_max:.1f} mm "
            f"(लगभग {per_acre_min_l}-{per_acre_max_l} लीटर/एकड़)।"
        )
        total_line = (
            f"आपकी {effective_land_acre:.2f} एकड़ जमीन के लिए कुल मात्रा: "
            f"{total_min_l}-{total_max_l} लीटर।"
        )

    return (
        f"आज का मौसम ({location}): तापमान {temperature_c:.1f}°C, वर्षा {precipitation_mm:.1f} mm ({source_label})। "
        f"फसल: {crop}।\n"
        f"{reason_line}\n"
        f"{quantity_line}\n"
        f"{total_line}\n"
        "समय सुझाव: सिंचाई सुबह 6-9 बजे या शाम 5-7 बजे करें, दोपहर में न करें।"
    )


def _build_current_weather_answer(location: str, weather: dict) -> str:
    temperature_c = float(weather.get("temperature_c", 0.0))
    precipitation_mm = float(weather.get("precipitation_mm", 0.0))
    source = str(weather.get("source", "weather"))
    source_label = "लाइव Open-Meteo" if source == "live_open_meteo" else "कैश्ड/ऑफलाइन मौसम"

    if source == "offline_default":
        reliability_line = "लाइव मौसम अभी उपलब्ध नहीं था, इसलिए डिफॉल्ट/ऑफलाइन डेटा इस्तेमाल हुआ।"
    elif source == "cached_weather":
        reliability_line = "लाइव मौसम उपलब्ध न होने पर हाल का कैश्ड मौसम इस्तेमाल हुआ।"
    else:
        reliability_line = "यह जानकारी आपके प्रोफाइल स्थान के लाइव मौसम से ली गई है।"

    if precipitation_mm >= 1.0:
        action_line = "आज बारिश/नमी है, इसलिए सिंचाई रोकें और जल निकास जांचें।"
    elif temperature_c >= 34:
        action_line = "तापमान अधिक है, सिंचाई सुबह/शाम करें और दोपहर में पानी न दें।"
    elif temperature_c <= 8:
        action_line = "ठंड अधिक है, हल्की सिंचाई रखें और कोमल पौधों की सुरक्षा करें।"
    else:
        action_line = "मौसम सामान्य है, मिट्टी की नमी देखकर सिंचाई करें।"

    return (
        f"आज का मौसम ({location}): तापमान {temperature_c:.1f}°C, वर्षा {precipitation_mm:.1f} mm ({source_label})।\n"
        f"{reliability_line}\n"
        f"तुरंत सलाह: {action_line}"
    )


def _simple_rule_reply(query_text: str, location: str, crop: str, role: str) -> tuple[str, list[str]]:
    text = query_text.strip().lower()
    normalized_role = _normalize_role(role)
    agri_context = _contains_any_token(
        text,
        [
            "फसल",
            "crop",
            "खेत",
            "soil",
            "मिट्टी",
            "fertilizer",
            "fertiliser",
            "khad",
            "khaad",
            "npk",
            "potassium",
            "phosphorus",
            "nitrogen",
            "urea",
            "dap",
            "potash",
            "irrigation",
            "sinchai",
            "पानी",
            "water",
            "yield",
            "पैदावार",
        ],
    )

    if not agri_context and _contains_any_token(text, ["स्वास्थ्य", "health", "बुखार", "दवाई", "डॉक्टर", "swasthya", "bukhar", "doctor", "medicine", "fever", "headache"]):
        return (
            "अगर तेज बुखार, सांस में दिक्कत, छाती दर्द, या लगातार कमजोरी हो तो तुरंत नजदीकी स्वास्थ्य केंद्र जाएं। हल्की समस्या में साफ पानी, संतुलित भोजन, और आराम रखें।",
            ["health_general"],
        )

    if _contains_any_token(text, ["योजना", "scheme", "सरकारी", "सब्सिडी", "लाभ", "yojana", "sarkari", "subsidy", "labh", "pm-kisan", "pension"]):
        return (
            "सरकारी योजना के लिए अपना आधार, बैंक खाता, और मोबाइल नंबर तैयार रखें। नजदीकी CSC/जन सेवा केंद्र या संबंधित विभाग में आवेदन स्थिति जांचें और रसीद सुरक्षित रखें।",
            ["gov_scheme_general"],
        )

    if normalized_role == "छात्र" and _contains_any_token(text, ["पढ़ाई", "education", "skill", "स्किल", "कोर्स", "career", "रोजगार", "नौकरी", "padhai", "course", "naukri", "job"]):
        return (
            "अपने लक्ष्य के अनुसार 1 मुख्य कौशल चुनें, रोज 60-90 मिनट अभ्यास करें, और हर सप्ताह छोटा प्रोजेक्ट बनाएं। पास के कॉलेज/स्किल सेंटर और सरकारी स्कॉलरशिप/स्किल योजनाएं जरूर देखें।",
            ["student_guidance"],
        )

    if normalized_role == "मजदूर" and _contains_any_token(text, ["काम", "job", "मजदूरी", "सुरक्षा", "contract", "salary", "majdoori", "kam", "suraksha", "payment"]):
        return (
            "काम शुरू करने से पहले मजदूरी दर, कार्य घंटे, और भुगतान तारीख लिखित में तय करें। सुरक्षा उपकरण (दस्ताने/जूते/हेलमेट) मांगें और भुगतान का रिकॉर्ड रखें।",
            ["worker_guidance"],
        )

    if _contains_any_token(text, ["hello", "hi", "नमस्ते", "सुन", "आवाज", "आवाज़", "voice", "namaste", "awaz"]):
        return (
            "हाँ, आपकी आवाज सुन पा रहा हूँ। आप खेती, स्वास्थ्य, शिक्षा/कौशल या सरकारी योजना से जुड़ा सवाल पूछ सकते हैं।",
            ["assistant_greeting"],
        )

    if _is_crop_growth_issue_query(text):
        return (
            "अगर आपकी फसल/पौधा ठीक से नहीं बढ़ रहा है, तो पहले 4 चीजें चेक करें: (1) मिट्टी में नमी और जल-निकास, (2) बीज/पौधे की गुणवत्ता, (3) संतुलित NPK और सूक्ष्म पोषक तत्व, (4) कीट/रोग लक्षण। अभी हल्की सिंचाई रखें, खेत में पानी भराव न होने दें, और 5-7 दिन में फर्क देखें। फसल का नाम और उम्र बताएं तो मैं सटीक मात्रा/शेड्यूल दूँगा।",
            ["crop_growth_troubleshooting"],
        )

    if _contains_any_token(text, ["बुवाई", "sowing", "buwai", "bowai"]):
        return (
            f"{location} में {crop} की बुवाई आमतौर पर अक्टूबर से नवंबर के बीच करें। मिट्टी में नमी हो तो अंकुरण अच्छा होगा।",
            ["crop_calendar_uttarakhand.json"],
        )
    if _contains_any_token(text, ["खाद", "fertilizer", "fertiliser", "khad", "khaad", "npk", "urea", "dap", "potash", "nitrogen", "phosphorus", "potassium", "nutrient", "dose", "dosage"]):
        return (
            f"{crop} के लिए नाइट्रोजन, फॉस्फोरस और पोटाश संतुलित मात्रा में दें। अपनी ज़मीन की जांच रिपोर्ट हो तो उसी के अनुसार मात्रा तय करें।",
            ["fertilizer_basics_north_india.json"],
        )
    if _contains_any_token(text, ["मौसम", "weather", "mausam", "barish", "rain", "temperature", "temp", "humidity", "rainfall"]):
        return (
            f"अगर अगले 24 घंटों में बारिश की संभावना हो तो सिंचाई टालें। {location} के लिए खेत में नमी देखकर ही पानी दें।",
            ["weather_rules_general.json"],
        )
    if _contains_any_token(text, ["सिंचाई", "irrigation", "irrigigation", "पानी", "water", "watering", "sinchai", "pani", "paani"]):
        return (
            f"{crop} में सिंचाई मिट्टी की नमी और मौसम देखकर करें। पहली सिंचाई क्रिटिकल स्टेज पर करें और पानी भराव से बचें।",
            ["weather_rules_general.json"],
        )
    if _contains_any_token(text, ["पैदावार", "yield", "paidavar", "production"]):
        return (
            f"{crop} की पैदावार बढ़ाने के लिए समय पर बुवाई, संतुलित खाद, खरपतवार नियंत्रण और सही सिंचाई शेड्यूल अपनाएं।",
            ["crop_calendar_uttarakhand.json", "fertilizer_basics_north_india.json"],
        )
    if _contains_any_token(text, ["फसल", "crop", "fasal"]):
        return (
            f"{location} और आपकी पसंद {crop} को देखते हुए अभी रबी सीजन की तैयारी रखें। खेत की जुताई और बीज उपचार पहले करें।",
            ["crop_selection_north_india.json"],
        )

    return (
        "कृपया खेती, स्वास्थ्य, शिक्षा/कौशल, या सरकारी योजना से जुड़ा सवाल पूछें। आप हिंदी, English या mixed भाषा में पूछ सकते हैं।",
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


def _needs_detailed_answer(query_text: str) -> bool:
    text = query_text.strip().lower()
    detail_hints = [
        "कैसे",
        "पूरी",
        "विस्तार",
        "detail",
        "step",
        "कदम",
        "plan",
        "मात्रा",
        "schedule",
        "calendar",
        "best practice",
    ]
    return len(text) > 45 or any(hint in text for hint in detail_hints)


def _build_llm_prompt(
    query_text: str,
    profile_role: str,
    profile_location: str,
    profile_land_size: float,
    profile_crop: str,
    base_answer: str,
    retrieval_summary: str,
    weather_line: str,
    detailed: bool,
) -> str:
    retrieval_context = retrieval_summary if retrieval_summary else "उपलब्ध नहीं"

    length_instruction = (
        "जवाब विस्तार से दें: कम से कम 8-12 बिंदुओं में चरणबद्ध सलाह, सही समय, मात्रा, लागत-संकेत, सावधानियां, और आम गलतियां शामिल करें। "
        "जहाँ उचित हो, किसान के लिए 7-दिन या 30-दिन की छोटी कार्य-योजना भी दें। अंतिम जवाब लगभग 700+ अक्षरों का रखें ताकि सलाह अधूरी न रहे।"
        if detailed
        else "जवाब छोटा और साफ रखें: 3-5 बिंदुओं में तुरंत काम आने वाली सलाह दें।"
    )

    return (
        "आप ग्रामीण भारत के लिए हिंदी-प्रथम बहु-क्षेत्रीय सहायक हैं। "
        "हमेशा स्पष्ट, सरल और क्रियात्मक सलाह दें। "
        f"{length_instruction} "
        "आप खेती, स्वास्थ्य, शिक्षा/कौशल, और सरकारी योजना में मदद करते हैं।"
        "अगर सवाल इन क्षेत्रों से बाहर हो, तो विनम्रता से प्रासंगिक क्षेत्र का प्रश्न पूछने के लिए प्रेरित करें।\n\n"
        f"उपयोगकर्ता प्रश्न: {query_text}\n"
        f"प्रोफाइल - भूमिका: {profile_role}, स्थान: {profile_location}, जमीन: {profile_land_size} एकड़, पसंदीदा फसल: {profile_crop}\n"
        f"नियम-आधारित संदर्भ: {base_answer}\n"
        f"नॉलेज-बेस संदर्भ: {retrieval_context}\n"
        f"मौसम संदर्भ: {weather_line}\n\n"
        "अंतिम जवाब सिर्फ हिंदी में दें और अनावश्यक अंग्रेजी से बचें। जवाब अधूरा न छोड़ें।"
    )


def _build_expand_prompt(original_question: str) -> str:
    return (
        "किसान के प्रश्न का विस्तृत और व्यावहारिक जवाब दें। जवाब अधूरा नहीं होना चाहिए। "
        "कम से कम 8-12 बिंदुओं में 700+ अक्षरों का जवाब दें। "
        "इन शीर्षकों को शामिल करें: (1) क्या करें अभी, (2) अगले 7 दिन, (3) अगले 30 दिन, "
        "(4) खाद/सिंचाई मात्रा, (5) आम गलतियां, (6) जोखिम और सावधानी।\n\n"
        f"मूल प्रश्न: {original_question}\n"
        "अंतिम जवाब सिर्फ सरल हिंदी में दें। किसी भी अंग्रेजी निर्देश, बुलेट-फॉर्मेटिंग कोड, या सिस्टम नोट्स शामिल न करें।"
    )


def _is_poor_detailed_answer(text: str) -> bool:
    cleaned = text.strip().lower()
    if len(cleaned) < 650:
        return True
    if "at the beginning" in cleaned or "emphasize" in cleaned:
        return True
    if cleaned.count("*") >= 3:
        return True
    if cleaned.endswith("**1.") or cleaned.endswith("**1"):
        return True
    if cleaned.endswith(":"):
        return True
    return False


def _build_detailed_fallback_answer(
    query_text: str,
    location: str,
    land_size_acre: float,
    crop: str,
    base_answer: str,
    retrieval_summary: str,
    weather_line: str,
) -> str:
    kb_line = retrieval_summary if retrieval_summary else "मिट्टी परीक्षण और स्थानीय कृषि विभाग की सलाह के आधार पर मात्रा समायोजित करें।"

    return (
        "1) अभी क्या करें:\n"
        f"- {base_answer}\n"
        "- खेत की नमी और जल निकास तुरंत जांचें।\n\n"
        "2) अगले 7 दिन की योजना:\n"
        "- मिट्टी की जांच रिपोर्ट देखें या सैंपल दें।\n"
        "- बीज/खाद/सिंचाई का रिकॉर्ड बनाएं।\n"
        "- खरपतवार और रोग के शुरुआती लक्षण मॉनिटर करें।\n\n"
        "3) अगले 30 दिन की योजना:\n"
        "- स्टेज-वाइज सिंचाई शेड्यूल फॉलो करें।\n"
        "- नाइट्रोजन को 2-3 किस्तों में दें, एक साथ भारी मात्रा न दें।\n"
        "- कीट/रोग दिखें तो अनुशंसित दवा सही समय और सही मात्रा में दें।\n\n"
        "4) खाद और सिंचाई (व्यावहारिक):\n"
        "- संतुलित NPK अपनाएं; जैविक पदार्थ/गोबर खाद शामिल करें।\n"
        "- पानी भराव न होने दें; हल्की और आवश्यकता-आधारित सिंचाई करें।\n"
        f"- संदर्भ: {kb_line}\n\n"
        "5) आम गलतियां जिनसे बचें:\n"
        "- बिना मिट्टी जांच के खाद की मात्रा तय करना।\n"
        "- पहली सिंचाई में देरी या अत्यधिक पानी देना।\n"
        "- खरपतवार नियंत्रण में देरी करना।\n\n"
        "6) मौसम आधारित सावधानी:\n"
        f"- {weather_line}\n"
        "- बारिश की संभावना हो तो सिंचाई टालें, तेज गर्मी में सुबह/शाम सिंचाई करें।\n\n"
        "7) अंतिम सुझाव:\n"
        "- हर 5-7 दिन पर खेत निरीक्षण करें और छोटे-छोटे सुधार तुरंत करें।\n"
        "- स्थानीय कृषि विज्ञान केंद्र (KVK) से क्षेत्र-विशिष्ट अनुशंसा अवश्य मिलाएं।"
    )


def generate_advisory(db: Session, query_text: str) -> dict:
    profile = get_or_create_profile(db)
    profile_role = _normalize_role(profile.role)
    weather = get_weather_context(db=db, location=profile.location)
    weather_tokens = ["बारिश" if weather.get("precipitation_mm", 0.0) > 0 else "शुष्क"]
    advisory_crop = (profile.crop_preference or "").strip() or "सामान्य"
    if advisory_crop in {"शिक्षा", "कौशल"}:
        advisory_crop = "सामान्य"
    normalized_query = query_text.strip().lower()
    agri_query = _is_agri_query(normalized_query)
    weather_query = _is_current_weather_query(normalized_query)

    if _is_irrigation_quantity_query(normalized_query):
        answer = _build_irrigation_quantity_answer(
            location=profile.location,
            crop=advisory_crop,
            land_size_acre=profile.land_size_acre,
            weather=weather,
        )
        mode = "weather_irrigation_quantified"
        sources = sorted(set([str(weather.get("source", "weather")), "irrigation_estimator"]))

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

    if weather_query:
        answer = _build_current_weather_answer(
            location=profile.location,
            weather=weather,
        )
        mode = "weather_current_observation"
        sources = sorted(set([str(weather.get("source", "weather")), "weather_current_observation"]))

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

    term_explanation = _build_term_explanation_answer(normalized_query)
    if term_explanation is not None:
        answer, sources = term_explanation
        mode = "agri_term_explanation"

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

    base_answer, sources = _simple_rule_reply(
        query_text=query_text,
        location=profile.location,
        crop=advisory_crop,
        role=profile_role,
    )

    retrieval_summary = ""
    retrieval_sources: list[str] = []
    if agri_query:
        retrieval_summary, retrieval_sources = _build_retrieval_summary(
            query_text=query_text,
            crop=advisory_crop,
            location=profile.location,
            weather_tokens=weather_tokens,
        )

    weather_line = _build_weather_advice(weather)
    answer_parts = [base_answer]
    if retrieval_summary:
        answer_parts.append(retrieval_summary)
    if agri_query:
        answer_parts.append(f"मौसम स्थिति: {weather_line}")
    fallback_answer = " ".join(part.strip() for part in answer_parts if part and part.strip())

    source_set = set(sources)
    source_set.update(retrieval_sources)
    if agri_query:
        source_set.add(str(weather.get("source", "weather")))
    sources = sorted(source_set)

    answer = fallback_answer
    mode = "hybrid_rule_retrieval"
    detailed = _needs_detailed_answer(query_text)

    use_llm = settings.enable_llm and settings.llm_api_key and agri_query

    if use_llm:
        llm_prompt = _build_llm_prompt(
            query_text=query_text,
            profile_role=profile_role,
            profile_location=profile.location,
            profile_land_size=profile.land_size_acre,
            profile_crop=advisory_crop,
            base_answer=base_answer,
            retrieval_summary=retrieval_summary,
            weather_line=weather_line,
            detailed=detailed,
        )

        try:
            answer = generate_with_gemini(
                api_key=settings.llm_api_key,
                prompt=llm_prompt,
                detailed=detailed,
            )

            if detailed and _is_poor_detailed_answer(answer):
                for _ in range(2):
                    expand_prompt = _build_expand_prompt(
                        original_question=query_text,
                    )
                    answer = generate_with_gemini(
                        api_key=settings.llm_api_key,
                        prompt=expand_prompt,
                        detailed=True,
                    )
                    if not _is_poor_detailed_answer(answer):
                        break

                if _is_poor_detailed_answer(answer):
                    mode = "hybrid_rule_retrieval_fallback"
                    answer = _build_detailed_fallback_answer(
                        query_text=query_text,
                        location=profile.location,
                        land_size_acre=profile.land_size_acre,
                        crop=advisory_crop,
                        base_answer=base_answer,
                        retrieval_summary=retrieval_summary,
                        weather_line=weather_line,
                    )
                else:
                    mode = "hybrid_llm_gemini"
                    sources = sorted(set(sources + ["gemini_api"]))
            else:
                mode = "hybrid_llm_gemini"
                sources = sorted(set(sources + ["gemini_api"]))
        except Exception:
            mode = "hybrid_rule_retrieval_fallback"
            if detailed:
                answer = _build_detailed_fallback_answer(
                    query_text=query_text,
                    location=profile.location,
                    land_size_acre=profile.land_size_acre,
                    crop=advisory_crop,
                    base_answer=base_answer,
                    retrieval_summary=retrieval_summary,
                    weather_line=weather_line,
                )

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
