"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ChatBubble from "@/components/ChatBubble";
import { queryAdvisory, synthesizeSpeech } from "@/lib/api";
import { queueEvent } from "@/lib/offline-queue";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import type { Language } from "@/lib/AppContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: "loading" | "streaming" | "done";
  canSpeak?: boolean;
}

function sanitizeAssistantText(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return "क्षमा करें, इस समय पूरा उत्तर उपलब्ध नहीं है। कृपया दोबारा पूछें।";
  }

  // Guard against visibly truncated markdown-like endings.
  if (/\*\*\d+\.?$/.test(normalized) || /[:\-]$/.test(normalized)) {
    return `${normalized}\n\nकृपया चाहें तो मैं जवाब आगे विस्तार से जारी रख सकता हूँ।`;
  }

  return normalized;
}

function speechLang(language: Language): string {
  return language === "en" ? "en-US" : "hi-IN";
}

function browserSpeechRate(language: Language): number {
  return language === "en" ? 1.02 : 0.98;
}

function cloudAudioPlaybackRate(language: Language): number {
  return language === "en" ? 1.04 : 1.08;
}

function sanitizeSpeechText(raw: string): string {
  return sanitizeAssistantText(raw)
    .replace(/\*\*/g, "")
    .replace(/[`#>_]/g, " ")
    .replace(/•/g, " ")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/(\d+)\)\s+/g, "$1. ")
    .trim();
}

function ChatContent() {
  const searchParams = useSearchParams();
  const { language } = useAppContext();
  const topic = searchParams.get("topic") || t("ask-here", language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [pausedMessageId, setPausedMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const streamAssistantMessage = async (messageId: string, fullText: string) => {
    const finalText = sanitizeAssistantText(fullText);
    let index = 0;
    const chunkSize = 3;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: "", status: "streaming" } : m
      )
    );

    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        index = Math.min(index + chunkSize, finalText.length);
        const next = finalText.slice(0, index);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: next,
                  status: index >= finalText.length ? "done" : "streaming",
                  canSpeak: index >= finalText.length,
                }
              : m
          )
        );

        if (index >= finalText.length) {
          clearInterval(timer);
          resolve();
        }
      }, 16);
    });
  };

  useEffect(() => {
    // Add initial AI message
    const initialGreeting = language === "hi"
      ? `नमस्ते! मैं आपकी "${topic}" के बारे में मदद कर सकता हूँ। कृपया अपना सवाल पूछें।`
      : `Hello! I can help you with "${topic}". Please ask your question.`;

    const initialMessage: Message = {
      id: "1",
      text: initialGreeting,
      isUser: false,
      timestamp: new Date(),
      canSpeak: false,
    };
    setMessages([initialMessage]);
  }, [topic, language]);

  useEffect(() => {
    const normalizedTopic = topic.trim();
    const defaultPrompt = t("ask-here", language).trim();

    // When user arrives from voice/home with a topic, auto-submit it as the first query.
    if (!normalizedTopic || normalizedTopic === defaultPrompt) {
      return;
    }

    let isCancelled = false;

    const runInitialQuery = async () => {
      setIsLoading(true);
      setError(null);

      const userMessage: Message = {
        id: `${Date.now()}-topic-user`,
        text: normalizedTopic,
        isUser: true,
        timestamp: new Date(),
        status: "done",
        canSpeak: false,
      };
      const loadingId = `${Date.now()}-topic-ai-loading`;
      const loadingMessage: Message = {
        id: loadingId,
        text: "",
        isUser: false,
        timestamp: new Date(),
        status: "loading",
        canSpeak: false,
      };
      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const response = await queryAdvisory(normalizedTopic);
        if (isCancelled) {
          return;
        }
        await streamAssistantMessage(loadingId, response.answer);
        await speakResponse(response.answer, loadingId);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        queueEvent("query_event", { text: normalizedTopic, source: "auto_topic" });

        const errorMessage = err instanceof Error ? err.message : t("error", language);
        setError(errorMessage);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  text: `✗ ${errorMessage}\n\n${t("please-retry", language)}`,
                  status: "done",
                }
              : m
          )
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void runInitialQuery();

    return () => {
      isCancelled = true;
    };
  }, [topic, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      status: "done",
      canSpeak: false,
    };

    const loadingId = `${Date.now()}-ai-loading`;
    const loadingMessage: Message = {
      id: loadingId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      status: "loading",
      canSpeak: false,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputText("");
    setIsLoading(true);
    setError(null);

    try {
      // Call the real API
      const response = await queryAdvisory(inputText);

      await streamAssistantMessage(loadingId, response.answer);
      await speakResponse(response.answer, loadingId);
    } catch (err) {
      queueEvent("query_event", { text: inputText, source: "chat_input" });

      const errorMessage = err instanceof Error ? err.message : t("error", language);
      setError(errorMessage);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: `✗ ${errorMessage}\n\n${t("please-retry", language)}`,
                status: "done",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const speakWithBrowser = (text: string, messageId: string): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }

    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(sanitizeSpeechText(text));
      const lang = speechLang(language);
      utterance.lang = lang;
      utterance.rate = browserSpeechRate(language);
      utterance.pitch = 1;

      const voices = synth.getVoices();
      const shortLang = lang.slice(0, 2).toLowerCase();
      const preferred =
        voices.find(
          (voice) =>
            voice.lang.toLowerCase().startsWith(shortLang) &&
            /(google|neural|zira|ananya|female)/i.test(voice.name)
        ) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(shortLang));

      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        setPlayingMessageId((current) => (current === messageId ? null : current));
        setPausedMessageId((current) => (current === messageId ? null : current));
      };

      utterance.onerror = () => {
        setPlayingMessageId((current) => (current === messageId ? null : current));
        setPausedMessageId((current) => (current === messageId ? null : current));
      };

      audioRef.current = null;
      synth.cancel();
      synth.speak(utterance);
      return true;
    } catch {
      return false;
    }
  };

  const speakResponse = async (text: string, messageId: string) => {
    if (!text.trim()) {
      return;
    }

    setPlayingMessageId(messageId);
    setPausedMessageId(null);

    if (speakWithBrowser(text, messageId)) {
      return;
    }

    try {
      const tts = await synthesizeSpeech(sanitizeSpeechText(text));
      const audio = new Audio(`data:${tts.mime_type};base64,${tts.audio_base64}`);
      audio.playbackRate = cloudAudioPlaybackRate(language);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingMessageId(null);
        setPausedMessageId(null);
      };

      await audio.play();
    } catch {
      // Fallback to browser TTS if API path fails.
      if (!speakWithBrowser(text, messageId)) {
        setPlayingMessageId(null);
        setPausedMessageId(null);
      }
    }
  };

  const stopSpeaking = () => {
    if (!playingMessageId) {
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    } else {
      window.speechSynthesis?.pause?.();
    }

    setPausedMessageId(playingMessageId);
    setPlayingMessageId(null);
  };

  const resumeSpeaking = () => {
    if (!pausedMessageId) {
      return;
    }

    const resumeId = pausedMessageId;
    setPlayingMessageId(resumeId);
    setPausedMessageId(null);

    if (audioRef.current) {
      void audioRef.current.play().catch(() => {
        setPlayingMessageId(null);
      });
      return;
    }

    window.speechSynthesis?.resume?.();
  };

  const handleSpeak = (text: string, messageId: string) => {
    if (pausedMessageId === messageId) {
      // Message is paused - resume it
      resumeSpeaking();
    } else if (playingMessageId === messageId) {
      // Currently playing this message - pause it
      stopSpeaking();
    } else if (playingMessageId) {
      // A different message is playing - stop it first
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis?.cancel();
      setPausedMessageId(null);
      // Start playing this message
      void speakResponse(text, messageId);
    } else {
      // Nothing playing - start this message
      void speakResponse(text, messageId);
    }
  };

  const handleVoiceInput = () => {
    if (typeof window === "undefined") {
      return;
    }

    // Better browser support checking
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI() as {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        stop: () => void;
        onresult: (event: any) => void;
        onerror: (event: any) => void;
        onend: () => void;
      };
      recognition.lang = speechLang(language);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (isListening) {
        recognition.stop();
        setIsListening(false);
        return;
      }

      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        setIsListening(false);

        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col app-shell">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 md:px-6 pt-4">
        <div className="mx-auto max-w-5xl glass-panel rounded-2xl px-4 py-3 border border-rural-green/18 shadow-soft">
          <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-9 w-9 rounded-full bg-rural-greenLight text-rural-greenDark flex items-center justify-center hover:bg-emerald-100 transition-colors"
          >
            <span className="text-xl">←</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-base md:text-lg font-semibold text-rural-greenDark truncate luxury-heading">{topic}</h1>
            <p className="text-xs text-slate-600">{t("ai-assistant", language)}</p>
          </div>
          <div className="h-9 w-9 rounded-full hero-gradient text-white flex items-center justify-center">🤖</div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 md:px-6 mt-3">
          <div className="mx-auto max-w-5xl rounded-xl border border-rose-300/70 bg-rose-50 px-3 py-2.5">
            <p className="text-xs text-rose-900">⚠️ {error}</p>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 pb-36">
        <div className="mx-auto max-w-5xl space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="animate-slide-up">
            {message.status === "loading" && !message.isUser ? (
              <div className="flex justify-start">
                <div className="max-w-[86%] md:max-w-[70%] rounded-2xl rounded-bl-md px-4 py-3 bg-white/90 border border-emerald-200 shadow-soft">
                  <div className="space-y-2">
                    <div className="h-2 rounded bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-100 bg-[length:200%_100%] animate-shimmer w-52" />
                    <div className="h-2 rounded bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-100 bg-[length:200%_100%] animate-shimmer w-64" />
                    <div className="h-2 rounded bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-100 bg-[length:200%_100%] animate-shimmer w-40" />
                  </div>
                </div>
              </div>
            ) : (
              <ChatBubble
                message={message.text}
                isUser={message.isUser}
                showSpeakButton={!message.isUser && message.canSpeak !== false && message.status !== "streaming"}
                onSpeak={() => !message.isUser && handleSpeak(message.text, message.id)}
                onStop={stopSpeaking}
                isPlaying={playingMessageId === message.id}
                language={language}
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start animate-fade-in">
            <div className="max-w-xs rounded-2xl px-4 py-3 bg-white/88 border border-emerald-200 rounded-bl-md shadow-soft">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-rural-greenDark rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-rural-greenDark rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 bg-rural-greenDark rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 md:px-6 pb-4 pt-2 bg-gradient-to-t from-[#ecf3ee] via-[#ecf3ee]/95 to-transparent">
        <div className="mx-auto max-w-5xl glass-panel rounded-2xl border border-rural-green/20 shadow-lux px-3 md:px-4 py-3">
        <div className="flex gap-2 items-end w-full">
          <button
            onClick={handleVoiceInput}
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all shadow-soft active:scale-95 ${
              isListening
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                : "hero-gradient text-white hover:shadow-lux"
            }`}
            aria-label="माइक्रोफोन"
            title={isListening ? "Listening..." : "Click to speak"}
          >
            🎤
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder={t("ask-here", language)}
            disabled={isLoading}
            className="field-input flex-1 text-sm disabled:opacity-60"
          />
          <button
            onClick={() => void handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="flex-shrink-0 w-11 h-11 rounded-full hero-gradient text-white flex items-center justify-center text-lg hover:shadow-lux disabled:opacity-60 transition-all shadow-soft active:scale-95"
            aria-label={t("send", language)}
          >
            ➤
          </button>
        </div>
        </div>
      </div>

      {/* Quick suggestion */}
      {/* {messages.length <= 1 && (
        <div className="px-4 pb-4">
          <Card className="text-center bg-rural-greenLight">
            <p className="text-xs text-slate-600 mb-2">{t("other-questions", language)}</p>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => setInputText(language === "hi" ? "इस बारे में और बताएं" : "Tell me more")}
                className="text-xs bg-rural-green text-white px-3 py-1 rounded-full hover:bg-rural-greenDark"
              >
                {t("learn-more", language)}
              </button>
              <button
                onClick={() => setInputText(language === "hi" ? "अगला विषय" : "Next topic")}
                className="text-xs border border-rural-green text-rural-green px-3 py-1 rounded-full hover:bg-rural-greenLight"
              >
                {t("next", language)}
              </button>
            </div>
          </Card>
        </div>
      )} */}
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rural-cream/70 flex items-center justify-center text-rural-greenDark">लोड हो रहा है...</div>}>
      <ChatContent />
    </Suspense>
  );
}