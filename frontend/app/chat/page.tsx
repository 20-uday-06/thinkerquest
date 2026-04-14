"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ChatBubble from "@/components/ChatBubble";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { queryAdvisory, synthesizeSpeech } from "@/lib/api";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import type { AdvisoryResponse } from "@/lib/types";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const { language } = useAppContext();
  const topic = searchParams.get("topic") || t("ask-here", language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    };
    setMessages([initialMessage]);
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
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setError(null);

    try {
      // Call the real API
      const response = await queryAdvisory(inputText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Attempt text-to-speech
      await speakResponse(response.answer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("error", language);
      setError(errorMessage);

      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `✗ ${errorMessage}\n\n${t("please-retry", language)}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakWithBrowser = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.9;
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
      // Fallback to browser TTS if API fails
      speakWithBrowser(text);
    }
  };

  const handleSpeak = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    setIsSpeaking(true);
    void speakResponse(text).finally(() => setIsSpeaking(false));
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
      recognition.lang = "hi-IN";
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
    <main className="min-h-screen w-full flex flex-col bg-gradient-to-b from-rural-cream via-rural-greenLight to-rural-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-rural-white shadow-soft p-4 border-b border-rural-greenLight">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{topic}</h1>
            <p className="text-xs text-slate-500">{t("ai-assistant", language)}</p>
          </div>
          <div className="text-2xl">🤖</div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-3 mx-4 mt-2 rounded-lg">
          <p className="text-xs text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="animate-slide-up">
            <ChatBubble
              message={message.text}
              isUser={message.isUser}
              showSpeakButton={!message.isUser && !message.text.includes("नमस्ते") && !message.text.includes("Hello")}
              onSpeak={() => !message.isUser && handleSpeak(message.text)}
            />
            {!message.isUser && !message.text.includes("नमस्ते") && !message.text.includes("Hello") && !message.text.includes("✗") && (
              <button
                onClick={() => handleSpeak(message.text)}
                disabled={isSpeaking}
                className="ml-2 mt-1 text-xs text-rural-greenDark hover:opacity-70 disabled:opacity-50 flex items-center gap-1"
              >
                <span>🔊</span>
                <span>{isSpeaking ? t("listening", language) : t("listen", language)}</span>
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start animate-fade-in">
            <div className="max-w-xs rounded-2xl px-4 py-3 bg-rural-greenLight rounded-bl-none">
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

      {/* Input area */}
      <div className="sticky bottom-0 bg-rural-white border-t border-rural-greenLight p-4 shadow-soft-lg">
        <div className="flex gap-2 items-end mb-3">
          <button
            onClick={handleVoiceInput}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all shadow-soft active:scale-95 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-rural-green hover:bg-rural-greenDark text-white"
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
            className="flex-1 rounded-2xl border-2 border-rural-greenLight px-4 py-3 text-sm focus:outline-none focus:border-rural-green transition-colors bg-rural-cream disabled:opacity-60"
          />
          <button
            onClick={() => void handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-rural-green text-white flex items-center justify-center text-xl hover:bg-rural-greenDark disabled:opacity-60 transition-all shadow-soft active:scale-95"
            aria-label={t("send", language)}
          >
            ✓
          </button>
        </div>
      </div>

      {/* Quick suggestion */}
      {messages.length <= 1 && (
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
      )}
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rural-cream flex items-center justify-center">लोड हो रहा है...</div>}>
      <ChatContent />
    </Suspense>
  );
}