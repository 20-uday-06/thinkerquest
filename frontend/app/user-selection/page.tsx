"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SelectionCard from "@/components/SelectionCard";
import Button from "@/components/Button";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";

const USER_ROLES = [
  {
    id: "किसान",
    icon: "🌾",
    label: "farmer",
    labelKey: "farmer",
    descKey: "farmer-desc",
  },
  {
    id: "छात्र",
    icon: "🎓",
    label: "student",
    labelKey: "student",
    descKey: "student-desc",
  },
  {
    id: "मजदूर",
    icon: "👷",
    label: "worker",
    labelKey: "worker",
    descKey: "worker-desc",
  },
];

export default function UserSelectionPage() {
  const router = useRouter();
  const { setUserRole, currentUserPhone, language } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Guard: redirect to login if not logged in
  useEffect(() => {
    if (!currentUserPhone) {
      router.push("/login");
    }
  }, [currentUserPhone, router]);

  const handleSelect = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (selectedRole) {
      setUserRole(selectedRole as any);
      // INTEGRATION: Redirect to onboarding details instead of home
      router.push("/onboarding-details");
    }
  };

  return (
    <main className="min-h-screen w-full px-5 py-8 app-shell">
      <section className="mx-auto max-w-3xl">
        <div className="hero-gradient rounded-[1.75rem] px-6 py-7 mb-5 border border-white/20 shadow-lux">
          <p className="text-xs uppercase tracking-[0.11em] text-emerald-100/80 mb-2">{t("welcome", language)}</p>
          <h1 className="text-3xl luxury-heading">{t("who-are-you", language)}</h1>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {USER_ROLES.map((role) => (
            <SelectionCard
              key={role.id}
              icon={role.icon}
              label={t(role.labelKey, language)}
              description={t(role.descKey, language)}
              isSelected={selectedRole === role.id}
              onClick={() => handleSelect(role.id)}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedRole}
            className="w-full"
          >
            {t("continue", language)}
          </Button>
          <button
            type="button"
            onClick={() => router.push("/landing")}
            className="text-sm text-slate-700 hover:text-rural-greenDark font-semibold transition-colors px-2"
          >
            {t("go-back", language)}
          </button>
        </div>
      </section>
    </main>
  );
}
