"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { flushQueue } from "@/lib/offline-queue";

export type UserRole = "किसान" | "छात्र" | "मजदूर" | null;
export type Language = "hi" | "en";

export interface UserProfileData {
  role: UserRole;
  location: string;
  crop?: string;
  landSize?: number;
  field?: string;
  interest?: string;
  skill?: string;
}

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  profileData: UserProfileData | null;
  setProfileData: (data: UserProfileData | null) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUserPhone: string | null;
  setCurrentUserPhone: (phone: string | null) => void;
  isNewUser: boolean;
  setIsNewUser: (isNew: boolean) => void;
  isLoggedIn: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [language, setLanguage] = useState<Language>("hi");
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isLoggedIn = currentUserPhone !== null;

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        void flushQueue();
      }
    }

    const stored = localStorage.getItem("appState");
    if (stored) {
      try {
        const state = JSON.parse(stored);
        if (state.userRole) setUserRole(state.userRole);
        if (state.hasCompletedOnboarding !== undefined)
          setHasCompletedOnboarding(state.hasCompletedOnboarding);
        if (state.profileData) setProfileData(state.profileData);
        if (state.language) setLanguage(state.language);
        if (state.currentUserPhone) setCurrentUserPhone(state.currentUserPhone);
        if (state.isNewUser !== undefined) setIsNewUser(state.isNewUser);
      } catch (error) {
        console.error("Failed to load app state from localStorage:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      void flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "appState",
        JSON.stringify({
          userRole,
          hasCompletedOnboarding,
          profileData,
          language,
          currentUserPhone,
          isNewUser,
        })
      );
    }
  }, [userRole, hasCompletedOnboarding, profileData, language, currentUserPhone, isNewUser, mounted]);

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        isOnline,
        setIsOnline,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
        profileData,
        setProfileData,
        language,
        setLanguage,
        currentUserPhone,
        setCurrentUserPhone,
        isNewUser,
        setIsNewUser,
        isLoggedIn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
