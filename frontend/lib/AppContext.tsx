"use client";

import React, { createContext, useContext, useState } from "react";

export type UserRole = "किसान" | "छात्र" | "मजदूर" | null;
export type Language = "hi" | "en";

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [language, setLanguage] = useState<Language>("hi");

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        isOnline,
        setIsOnline,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
        language,
        setLanguage,
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
