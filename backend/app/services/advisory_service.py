from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ConversationLog
from app.services.knowledge_service import retrieve_facts
from app.services.llm_service import generate_with_gemini
from app.services.profile_service import get_or_create_profile
from app.services.weather_service import get_weather_context

settings = get_settings()


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
    ]
    return any(token in text for token in agri_tokens)


def _simple_rule_reply(query_text: str, location: str, crop: str, role: str) -> tuple[str, list[str]]:
    text = query_text.strip().lower()
    normalized_role = _normalize_role(role)

    if any(token in text for token in ["स्वास्थ्य", "health", "बुखार", "दवाई", "डॉक्टर", "swasthya", "bukhar", "doctor", "medicine"]):
        return (
            "अगर तेज बुखार, सांस में दिक्कत, छाती दर्द, या लगातार कमजोरी हो तो तुरंत नजदीकी स्वास्थ्य केंद्र जाएं। हल्की समस्या में साफ पानी, संतुलित भोजन, और आराम रखें।",
            ["health_general"],
        )

    if any(token in text for token in ["योजना", "scheme", "सरकारी", "सब्सिडी", "लाभ", "yojana", "sarkari", "subsidy", "labh"]):
        return (
            "सरकारी योजना के लिए अपना आधार, बैंक खाता, और मोबाइल नंबर तैयार रखें। नजदीकी CSC/जन सेवा केंद्र या संबंधित विभाग में आवेदन स्थिति जांचें और रसीद सुरक्षित रखें।",
            ["gov_scheme_general"],
        )

    if normalized_role == "छात्र" and any(token in text for token in ["पढ़ाई", "education", "skill", "स्किल", "कोर्स", "career", "रोजगार", "नौकरी", "padhai", "course", "naukri", "job"]):
        return (
            "अपने लक्ष्य के अनुसार 1 मुख्य कौशल चुनें, रोज 60-90 मिनट अभ्यास करें, और हर सप्ताह छोटा प्रोजेक्ट बनाएं। पास के कॉलेज/स्किल सेंटर और सरकारी स्कॉलरशिप/स्किल योजनाएं जरूर देखें।",
            ["student_guidance"],
        )

    if normalized_role == "मजदूर" and any(token in text for token in ["काम", "job", "मजदूरी", "सुरक्षा", "contract", "salary", "majdoori", "kam", "suraksha", "payment"]):
        return (
            "काम शुरू करने से पहले मजदूरी दर, कार्य घंटे, और भुगतान तारीख लिखित में तय करें। सुरक्षा उपकरण (दस्ताने/जूते/हेलमेट) मांगें और भुगतान का रिकॉर्ड रखें।",
            ["worker_guidance"],
        )

    if any(token in text for token in ["hello", "hi", "नमस्ते", "सुन", "आवाज", "आवाज़", "voice", "namaste", "awaz"]):
        return (
            "हाँ, आपकी आवाज सुन पा रहा हूँ। आप खेती, स्वास्थ्य, शिक्षा/कौशल या सरकारी योजना से जुड़ा सवाल पूछ सकते हैं।",
            ["assistant_greeting"],
        )

    if any(token in text for token in ["बुवाई", "sowing", "buwai", "bowai"]):
        return (
            f"{location} में {crop} की बुवाई आमतौर पर अक्टूबर से नवंबर के बीच करें। मिट्टी में नमी हो तो अंकुरण अच्छा होगा।",
            ["crop_calendar_uttarakhand.json"],
        )
    if any(token in text for token in ["खाद", "fertilizer", "fertiliser", "khad", "khaad"]):
        return (
            f"{crop} के लिए नाइट्रोजन, फॉस्फोरस और पोटाश संतुलित मात्रा में दें। अपनी ज़मीन की जांच रिपोर्ट हो तो उसी के अनुसार मात्रा तय करें।",
            ["fertilizer_basics_north_india.json"],
        )
    if any(token in text for token in ["मौसम", "weather", "mausam", "barish", "rain"]):
        return (
            f"अगर अगले 24 घंटों में बारिश की संभावना हो तो सिंचाई टालें। {location} के लिए खेत में नमी देखकर ही पानी दें।",
            ["weather_rules_general.json"],
        )
    if any(token in text for token in ["सिंचाई", "irrigation", "पानी", "water", "sinchai", "pani", "paani"]):
        return (
            f"{crop} में सिंचाई मिट्टी की नमी और मौसम देखकर करें। पहली सिंचाई क्रिटिकल स्टेज पर करें और पानी भराव से बचें।",
            ["weather_rules_general.json"],
        )
    if any(token in text for token in ["पैदावार", "yield", "paidavar", "production"]):
        return (
            f"{crop} की पैदावार बढ़ाने के लिए समय पर बुवाई, संतुलित खाद, खरपतवार नियंत्रण और सही सिंचाई शेड्यूल अपनाएं।",
            ["crop_calendar_uttarakhand.json", "fertilizer_basics_north_india.json"],
        )
    if any(token in text for token in ["फसल", "crop", "fasal"]):
        return (
            f"{location} और आपकी पसंद {crop} को देखते हुए अभी रबी सीजन की तैयारी रखें। खेत की जुताई और बीज उपचार पहले करें।",
            ["crop_selection_north_india.json"],
        )

    return (
        "कृपया खेती, स्वास्थ्य, शिक्षा/कौशल, या सरकारी योजना से जुड़ा सवाल पूछें। मैं सरल और काम की सलाह दूंगा।",
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
        f"आपका सवाल: {query_text}\n"
        f"प्रोफाइल: स्थान {location}, जमीन {land_size_acre} एकड़, फसल {crop}\n\n"
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
    agri_query = _is_agri_query(query_text.strip().lower())

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
    profile_context = f"आपका स्थान: {profile.location}"
    if profile_role == "किसान":
        profile_context += f", जमीन: {profile.land_size_acre} एकड़, पसंदीदा फसल: {advisory_crop}"
    else:
        profile_context += f", भूमिका: {profile_role}"

    if retrieval_summary:
        fallback_answer = (
            f"{profile_context}। "
            f"{base_answer} {retrieval_summary} मौसम स्थिति: {weather_line}"
        )
        sources = sorted(set(sources + retrieval_sources + [str(weather.get("source", "weather"))]))
    else:
        fallback_answer = (
            f"{profile_context}। "
            f"{base_answer} मौसम स्थिति: {weather_line}"
        )
        sources = sorted(set(sources + [str(weather.get("source", "weather"))]))

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
