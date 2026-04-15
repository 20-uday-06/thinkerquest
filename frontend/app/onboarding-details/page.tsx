"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import { completeOnboarding } from "@/lib/api";
import { queueEvent } from "@/lib/offline-queue";

export default function OnboardingDetailsPage() {
  const router = useRouter();
  const { userRole, language, currentUserPhone, setProfileData, setHasCompletedOnboarding } = useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // INTEGRATION: Dynamic form state based on role
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    location: "",
    // Farmer fields
    crop: "",
    landSize: "",
    // Student fields
    field: "",
    interest: "",
    // Worker fields
    skill: "",
  });

  // Guard: redirect to login if not logged in
  useEffect(() => {
    if (!currentUserPhone) {
      router.push("/login");
    } else {
      // Pre-fill phone number
      setFormData(prev => ({ ...prev, phone_number: currentUserPhone }));
    }
  }, [currentUserPhone, router]);

  // Redirect if no role selected
  if (!userRole) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 app-shell">
        <Card className="bg-red-50 border-l-4 border-l-red-400 max-w-md">
          <p className="text-red-900 font-semibold mb-2">❌ {t("onboarding-error", language)}</p>
          <p className="text-sm text-red-800">{t("error", language)}</p>
          <Link href="/user-selection">
            <Button className="mt-4 w-full">{t("go-back", language)}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError(t("onboarding-error-name", language) || "कृपया नाम दर्ज करें");
      return false;
    }

    if (!formData.phone_number.trim() || formData.phone_number.length < 10) {
      setError(t("onboarding-error-phone", language) || "कृपया सही फोन नंबर दर्ज करें");
      return false;
    }

    if (!formData.location.trim()) {
      setError(t("onboarding-error-location", language));
      return false;
    }

    if (userRole === "किसान" && (!formData.crop.trim() || !formData.landSize.trim())) {
      setError(t("onboarding-error-farmer", language));
      return false;
    }

    if (userRole === "छात्र" && (!formData.field.trim() || !formData.interest.trim())) {
      setError(t("onboarding-error-student", language));
      return false;
    }

    if (userRole === "मजदूर" && !formData.skill.trim()) {
      setError(t("onboarding-error-worker", language));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    console.log("🔄 Starting onboarding submission...");

    try {
      // INTEGRATION: Call onboarding API
      const payload = {
        name: formData.name.trim(),
        phone_number: formData.phone_number.trim(),
        role: userRole,
        location: formData.location.trim(),
        crop: userRole === "किसान" ? formData.crop.trim() : undefined,
        land_size: userRole === "किसान" ? parseFloat(formData.landSize) : undefined,
        field: userRole === "छात्र" ? formData.field.trim() : undefined,
        interest: userRole === "छात्र" ? formData.interest.trim() : undefined,
        skill: userRole === "मजदूर" ? formData.skill.trim() : undefined,
      };

      console.log("📤 Sending payload:", payload);

      const response = await completeOnboarding(payload);
      console.log("✅ API Response:", response);

      // INTEGRATION: Update context with profile data
      setProfileData({
        role: userRole,
        location: formData.location.trim(),
        crop: userRole === "किसान" ? formData.crop.trim() : undefined,
        landSize: userRole === "किसान" ? parseFloat(formData.landSize) : undefined,
        field: userRole === "छात्र" ? formData.field.trim() : undefined,
        interest: userRole === "छात्र" ? formData.interest.trim() : undefined,
        skill: userRole === "मजदूर" ? formData.skill.trim() : undefined,
      });

      setHasCompletedOnboarding(true);
      console.log("🎉 Onboarding completed, redirecting to home...");

      // Redirect to home
      router.push("/");
    } catch (err) {
      console.error("❌ Error:", err);
      queueEvent("profile_update", {
        name: formData.name.trim(),
        phone_number: formData.phone_number.trim(),
        role: userRole,
        has_completed_onboarding: true,
        location: formData.location.trim(),
        land_size_acre: userRole === "किसान" ? parseFloat(formData.landSize) || 1.0 : 1.0,
        crop_preference: userRole === "किसान" ? formData.crop.trim() || "सामान्य" : "सामान्य",
        field_of_study: userRole === "छात्र" ? formData.field.trim() : undefined,
        interest_area: userRole === "छात्र" ? formData.interest.trim() : undefined,
        skill: userRole === "मजदूर" ? formData.skill.trim() : undefined,
        worker_location: userRole === "मजदूर" ? formData.location.trim() : undefined,
      });

      const errorMsg = err instanceof Error ? err.message : t("error", language);
      setError(`${errorMsg}. प्रोफ़ाइल ऑफलाइन कतार में सहेजी गई है और इंटरनेट आने पर सिंक होगी।`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col p-5 md:p-7 app-shell">
      {/* Header */}
      <div className="mb-6 text-center max-w-2xl mx-auto w-full rounded-3xl hero-gradient px-6 py-6 border border-white/20 shadow-lux">
        <Link
          href="/user-selection"
          className="h-9 w-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors inline-flex mb-4"
        >
          <span className="text-xl">←</span>
        </Link>
        <h1 className="text-2xl md:text-3xl luxury-heading text-white mb-1">
          {t("onboarding-details", language)}
        </h1>
        <p className="text-sm text-emerald-100/95">
          {userRole === "किसान" && t("onboarding-farmer-subtitle", language)}
          {userRole === "छात्र" && t("onboarding-student-subtitle", language)}
          {userRole === "मजदूर" && t("onboarding-worker-subtitle", language)}
        </p>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl mx-auto w-full bg-white/88 border border-rural-green/20">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-l-red-400 p-3 rounded mb-6 text-sm text-red-800">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name field - Common for all roles */}
          <div>
            <label className="muted-label mb-2 block">
              {t("onboarding-name", language)} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("onboarding-name-ph", language)}
              disabled={isLoading}
              className="field-input text-sm disabled:opacity-60"
            />
          </div>

          {/* Phone number field - Common for all roles - READ ONLY */}
          <div>
            <label className="muted-label mb-2 block">
              {t("onboarding-phone", language)} *
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              readOnly
              placeholder={t("onboarding-phone-ph", language)}
              disabled={isLoading}
              className="field-input text-sm disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">लॉगिन फोन नंबर से सेट</p>
          </div>

          {/* Location field - Common for all roles */}
          <div>
            <label className="muted-label mb-2 block">
              {t("onboarding-location", language)}
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder={t("onboarding-location-ph", language)}
              disabled={isLoading}
              className="field-input text-sm disabled:opacity-60"
            />
          </div>

          {/* INTEGRATION: Farmer-specific fields */}
          {userRole === "किसान" && (
            <>
              <div>
                <label className="muted-label mb-2 block">
                  {t("onboarding-crop", language)}
                </label>
                <input
                  type="text"
                  name="crop"
                  value={formData.crop}
                  onChange={handleInputChange}
                  placeholder={t("onboarding-crop-ph", language)}
                  disabled={isLoading}
                  className="field-input text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="muted-label mb-2 block">
                  {t("onboarding-land-size", language)}
                </label>
                <input
                  type="number"
                  name="landSize"
                  value={formData.landSize}
                  onChange={handleInputChange}
                  placeholder={t("onboarding-land-ph", language)}
                  inputMode="decimal"
                  step="0.1"
                  disabled={isLoading}
                  className="field-input text-sm disabled:opacity-60"
                />
              </div>
            </>
          )}

          {/* INTEGRATION: Student-specific fields */}
          {userRole === "छात्र" && (
            <>
              <div>
                <label className="muted-label mb-2 block">
                  {t("onboarding-field", language)}
                </label>
                <input
                  type="text"
                  name="field"
                  value={formData.field}
                  onChange={handleInputChange}
                  placeholder={t("onboarding-field-ph", language)}
                  disabled={isLoading}
                  className="field-input text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="muted-label mb-2 block">
                  {t("onboarding-interest", language)}
                </label>
                <input
                  type="text"
                  name="interest"
                  value={formData.interest}
                  onChange={handleInputChange}
                  placeholder={t("onboarding-interest-ph", language)}
                  disabled={isLoading}
                  className="field-input text-sm disabled:opacity-60"
                />
              </div>
            </>
          )}

          {/* INTEGRATION: Worker-specific fields */}
          {userRole === "मजदूर" && (
            <div>
              <label className="muted-label mb-2 block">
                {t("onboarding-skill", language)}
              </label>
              <input
                type="text"
                name="skill"
                value={formData.skill}
                onChange={handleInputChange}
                placeholder={t("onboarding-skill-ph", language)}
                disabled={isLoading}
                className="field-input text-sm disabled:opacity-60"
              />
            </div>
          )}

          {/* Submit button */}
          <Button
            size="md"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? t("onboarding-submitting", language) : t("onboarding-submit", language)}
          </Button>
        </form>
      </Card>

      {/* Info text */}
      <p className="text-xs text-slate-700 text-center mt-6 max-w-2xl mx-auto px-4 leading-relaxed">
        {t("onboarding-info", language)}
      </p>
    </main>
  );
}
