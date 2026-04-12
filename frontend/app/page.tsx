"use client";

import { useEffect, useState } from "react";

import { getProfile, queryAdvisory, synthesizeSpeech, updateProfile } from "@/lib/api";
import { flushQueue, loadQueue, queueEvent } from "@/lib/offline-queue";
import type { AdvisoryResponse, UserProfile } from "@/lib/types";

const SUGGESTED_QUERIES = [
  "गेहूं की बुवाई कब करें?",
  "खाद की मात्रा कैसे तय करें?",
  "कल बारिश हो तो सिंचाई कब करें?",
];

type ProfileFormState = {
  location: string;
  land_size_acre: string;
  crop_preference: string;
};

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    location: "",
    land_size_acre: "",
    crop_preference: "",
  });
  const [queryText, setQueryText] = useState("");
  const [response, setResponse] = useState<AdvisoryResponse | null>(null);
  const [status, setStatus] = useState("प्रोफ़ाइल लोड हो रही है...");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (typeof navigator !== "undefined") {
        setOnline(navigator.onLine);
      }
      setQueueCount(loadQueue().length);
      try {
        const fetchedProfile = await getProfile();
        setProfile(fetchedProfile);
        setProfileForm({
          location: fetchedProfile.location,
          land_size_acre: fetchedProfile.land_size_acre.toString(),
          crop_preference: fetchedProfile.crop_preference,
        });
        setStatus("प्रोफ़ाइल तैयार है");
      } catch {
        setStatus("ऑफ़लाइन मोड: कैश/नियम आधारित सलाह उपलब्ध");
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onOnline = () => {
      setOnline(true);
      setStatus("नेटवर्क वापस आया, सिंक प्रयास जारी...");
      void handleFlushQueue(true);
    };

    const onOffline = () => {
      setOnline(false);
      setStatus("आप ऑफ़लाइन हैं, अनुरोध स्थानीय कतार में सेव होंगे");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleSaveProfile = async () => {
    const landValue = Number(profileForm.land_size_acre);
    if (!profileForm.location.trim() || !profileForm.crop_preference.trim() || Number.isNaN(landValue) || landValue <= 0) {
      setStatus("कृपया सही प्रोफ़ाइल जानकारी भरें");
      return;
    }

    const payload = {
      location: profileForm.location.trim(),
      land_size_acre: landValue,
      crop_preference: profileForm.crop_preference.trim(),
    };

    setIsLoading(true);
    try {
      const updated = await updateProfile(payload);
      setProfile(updated);
      setStatus("प्रोफ़ाइल अपडेट हो गई");
    } catch {
      queueEvent("profile_update", payload);
      const updatedQueueCount = loadQueue().length;
      setQueueCount(updatedQueueCount);
      setStatus("नेटवर्क नहीं है: प्रोफ़ाइल बदलाव सिंक कतार में जोड़ दिया गया");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async (text?: string) => {
    const finalText = (text ?? queryText).trim();
    if (!finalText) {
      setStatus("कृपया सवाल लिखें या सुझाए गए कार्ड चुनें");
      return;
    }

    setIsLoading(true);
    setStatus("सलाह तैयार हो रही है...");
    try {
      const apiResponse = await queryAdvisory(finalText);
      setResponse(apiResponse);
      setStatus("सलाह तैयार");
      await speakResponse(apiResponse.answer);
    } catch {
      queueEvent("query_request", { text: finalText });
      setQueueCount(loadQueue().length);
      setResponse({
        answer:
          "अभी नेटवर्क उपलब्ध नहीं है। कृपया मौसम और खेत की नमी देखकर सिंचाई करें, और फसल के अनुसार संतुलित खाद दें।",
        mode: "offline_fallback",
        language: "hi",
        generated_at: new Date().toISOString(),
        sources: ["offline_rule_cache"],
      });
      setStatus("ऑफ़लाइन सलाह दिखाई गई, अनुरोध कतार में सेव है");
      await speakResponse(
        "अभी नेटवर्क उपलब्ध नहीं है। कृपया खेत की नमी देखकर सिंचाई और संतुलित खाद का उपयोग करें।"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const speakWithBrowser = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const speakResponse = async (text: string) => {
    if (!text.trim()) {
      return;
    }

    try {
      const tts = await synthesizeSpeech(text);
      const audio = new Audio(`data:${tts.mime_type};base64,${tts.audio_base64}`);
      await audio.play();
    } catch {
      speakWithBrowser(text);
    }
  };

  const handleVoiceInput = () => {
    if (typeof window === "undefined") {
      setStatus("आवाज़ सुविधा उपलब्ध नहीं है");
      return;
    }

    const speechRecognitionApi =
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ??
      (window as Window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;

    if (!speechRecognitionApi) {
      setStatus("ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है");
      return;
    }

    const recognition = new speechRecognitionApi();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setStatus("सुन रहा हूँ... बोलिए");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
      setQueryText(transcript);
      if (transcript) {
        void handleAsk(transcript);
      }
    };

    recognition.onerror = () => {
      setStatus("आवाज़ पहचान असफल, कृपया फिर कोशिश करें");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleFlushQueue = async (silent = false) => {
    setIsLoading(true);
    const result = await flushQueue();
    setQueueCount(result.remaining);
    if (!silent) {
      setStatus(
        result.remaining === 0
          ? `सिंक सफल (${result.accepted} स्वीकार, ${result.ignored} उपेक्षित)`
          : "सिंक अधूरा, नेटवर्क जांचें"
      );
    } else if (result.remaining === 0 && result.sent > 0) {
      setStatus(`ऑटो-सिंक सफल (${result.accepted} स्वीकार, ${result.ignored} उपेक्षित)`);
    }
    setIsLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-surface p-4">
      <header className="rounded-2xl bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-accent">ग्रामीण सहायक</h1>
        <p className="mt-1 text-sm text-slate-700">आवाज़ से पूछें: फसल, बुवाई, खाद, मौसम सलाह</p>
        <p className="mt-2 rounded-lg bg-accentSoft px-3 py-2 text-xs text-slate-700">स्थिति: {status}</p>
      </header>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <button
          type="button"
          disabled={isLoading || !online}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-5 text-lg font-semibold text-white disabled:opacity-60"
          aria-label="माइक्रोफोन शुरू करें"
          onClick={handleVoiceInput}
        >
          <span aria-hidden>🎤</span>
          <span>{isListening ? "सुन रहा हूँ..." : isLoading ? "प्रक्रिया जारी..." : "बोलकर पूछें"}</span>
        </button>
        <input
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          placeholder="उदाहरण: गेहूं की बुवाई कब करें?"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">तुरंत सवाल</h2>
        <div className="mt-3 grid gap-2">
          {SUGGESTED_QUERIES.map((suggested) => (
            <button
              key={suggested}
              type="button"
              onClick={() => void handleAsk(suggested)}
              className="rounded-xl bg-accentSoft p-3 text-left text-sm"
            >
              🌾 {suggested}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">आपकी प्रोफ़ाइल</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <input
            value={profileForm.location}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, location: event.target.value }))
            }
            placeholder="स्थान (उदा. देहरादून, उत्तराखंड)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-accent"
          />
          <input
            value={profileForm.land_size_acre}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, land_size_acre: event.target.value }))
            }
            placeholder="जमीन (एकड़)"
            inputMode="decimal"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-accent"
          />
          <input
            value={profileForm.crop_preference}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, crop_preference: event.target.value }))
            }
            placeholder="पसंदीदा फसल"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={isLoading}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            प्रोफ़ाइल सेव करें
          </button>
        </div>
        {profile ? (
          <p className="mt-2 text-xs text-slate-500">
            सक्रिय प्रोफ़ाइल: {profile.location}, {profile.land_size_acre} एकड़, {profile.crop_preference}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">ऑफ़लाइन सिंक</h2>
        <p className="mt-2 text-sm text-slate-700">कतार में अनुरोध: {queueCount}</p>
        <p className="mt-1 text-xs text-slate-500">
          नेटवर्क: {online ? "ऑनलाइन" : "ऑफ़लाइन"} | नीति: Latest update wins
        </p>
        <button
          type="button"
          onClick={() => void handleFlushQueue()}
          disabled={isLoading || queueCount === 0 || !online}
          className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          अभी सिंक करें
        </button>
      </section>

      {response ? (
        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600">सलाह</h2>
          <article className="mt-3 rounded-xl bg-accentSoft p-3 text-sm leading-6">{response.answer}</article>
          <p className="mt-2 text-xs text-slate-500">मोड: {response.mode}</p>
          <p className="mt-1 text-xs text-slate-500">स्रोत: {response.sources.join(", ")}</p>
        </section>
      ) : null}
    </main>
  );
}
