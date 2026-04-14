"use client";

import { useState } from "react";
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
  const { setUserRole, setHasCompletedOnboarding, language } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleSelect = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (selectedRole) {
      setUserRole(selectedRole as any);
      setHasCompletedOnboarding(true);
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col p-6 bg-gradient-to-br from-rural-greenLight via-rural-cream to-rural-yellow">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-sm text-slate-600 mb-2">{t("welcome", language)}</p>
        <h1 className="text-2xl font-bold text-slate-900">{t("who-are-you", language)}</h1>
      </div>

      {/* Selection cards */}
      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
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

      {/* Continue button */}
      <div className="mt-8 max-w-md mx-auto w-full">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full font-semibold"
        >
          {t("continue", language)}
        </Button>
        <button
          type="button"
          onClick={() => router.push("/landing")}
          className="w-full mt-3 text-sm text-slate-600 hover:text-slate-900 font-semibold transition-colors"
        >
          {t("go-back", language)}
        </button>
      </div>
    </main>
  );
}
