"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import LanguageToggle from "@/components/LanguageToggle";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import { getProfile, updateProfile } from "@/lib/api";
import { queueEvent } from "@/lib/offline-queue";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { userRole, setUserRole, setHasCompletedOnboarding, language, profileData, setProfileData } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [profileApiData, setProfileApiData] = useState<UserProfile | null>(null);
  // INTEGRATION: Extended form data to include role and onboarding fields
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    role: userRole || "",
    location: "",
    land_size_acre: "",
    crop_preference: "",
    // Farmer-specific
    farm_type: "",
    // Student-specific
    field_of_study: "",
    interest_area: "",
    // Worker-specific
    skill: "",
    worker_location: "",
  });

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profile = await getProfile();
        setProfileApiData(profile);
        // INTEGRATION: Load all onboarding and profile fields
        setFormData({
          name: profile.name || "",
          phone_number: profile.phone_number || "",
          role: profile.role || userRole || "",
          location: profile.location,
          land_size_acre: profile.land_size_acre.toString(),
          crop_preference: profile.crop_preference,
          farm_type: profile.farm_type || "",
          field_of_study: profile.field_of_study || "",
          interest_area: profile.interest_area || "",
          skill: profile.skill || "",
          worker_location: profile.worker_location || "",
        });
        setStatus("प्रोफ़ाइल लोड हो गई");

        // Dismiss after 6 seconds
        setTimeout(() => {
          setStatus("");
        }, 6000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "प्रोफ़ाइल लोड करने में त्रुटि";
        setError(errorMsg);
        setStatus(errorMsg);
        // Set some default values if API fails
        setFormData({
          name: "",
          phone_number: "",
          role: userRole || "",
          location: "आपका स्थान",
          land_size_acre: "5",
          crop_preference: "गेहूं",
          farm_type: "",
          field_of_study: "",
          interest_area: "",
          skill: "",
          worker_location: "",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [userRole]);

  const handleEdit = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const landValue = Number(formData.land_size_acre);

    if (!formData.location.trim() || !formData.crop_preference.trim() || Number.isNaN(landValue) || landValue <= 0) {
      setError("कृपया सभी क्षेत्र सही तरीके से भरें");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // INTEGRATION: Save all profile and onboarding data
      const updated = await updateProfile({
        name: formData.name.trim() || undefined,
        phone_number: formData.phone_number.trim() || undefined,
        role: formData.role || userRole,
        has_completed_onboarding: true,
        location: formData.location.trim(),
        land_size_acre: landValue,
        crop_preference: formData.crop_preference.trim(),
        farm_type: formData.farm_type || undefined,
        field_of_study: formData.field_of_study || undefined,
        interest_area: formData.interest_area || undefined,
        skill: formData.skill || undefined,
        worker_location: formData.worker_location || undefined,
      });

      setProfileApiData(updated);
      // INTEGRATION: Update context with new profile data
      setProfileData({
        role: formData.role as any || userRole,
        location: formData.location.trim(),
        crop: formData.crop_preference.trim(),
        landSize: landValue,
        field: formData.field_of_study || undefined,
        interest: formData.interest_area || undefined,
        skill: formData.skill || undefined,
      });

      setStatus("✓ प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई");

      setTimeout(() => {
        setStatus("");
      }, 2000);
    } catch (err) {
      queueEvent("profile_update", {
        name: formData.name.trim() || undefined,
        phone_number: formData.phone_number.trim() || undefined,
        role: formData.role || userRole,
        has_completed_onboarding: true,
        location: formData.location.trim(),
        land_size_acre: landValue,
        crop_preference: formData.crop_preference.trim(),
        farm_type: formData.farm_type || undefined,
        field_of_study: formData.field_of_study || undefined,
        interest_area: formData.interest_area || undefined,
        skill: formData.skill || undefined,
        worker_location: formData.worker_location || undefined,
      });

      const errorMsg = err instanceof Error ? err.message : "प्रोफ़ाइल अपडेट करने में त्रुटि";
      setError(`${errorMsg} (ऑफलाइन कतार में सहेजा गया)`);
      setStatus("इंटरनेट आने पर प्रोफ़ाइल अपने आप सिंक हो जाएगी");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setHasCompletedOnboarding(false);
    router.push("/landing");
  };

  return (
    <main className="min-h-screen w-full flex flex-col p-4 pb-safe bg-gradient-to-b from-rural-cream via-rural-greenLight to-rural-cream safe-area">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">{t("your-profile", language)}</h1>
        </div>
      </header>

      {/* Status messages */}
      {error && (
        <Card className="mb-4 bg-red-50 border-l-4 border-l-red-400">
          <p className="text-sm text-red-800">❌ {error}</p>
        </Card>
      )}

      {status && !error && (
        <Card className="mb-4 bg-green-50 border-l-4 border-l-green-400">
          <p className="text-sm text-green-800">{status}</p>
        </Card>
      )}

      {/* Main content - Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* LEFT COLUMN - Profile Info */}
        <div className="lg:col-span-1 flex flex-col gap-6 pt-24">
          {/* Avatar Card */}
          <Card className="text-center bg-gradient-to-br from-rural-greenLight to-rural-cream h-80 flex flex-col justify-between py-6">
            <div>
              <div className="text-7xl mb-4">👤</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                {formData.name || "उपयोगकर्ता"}
              </h2>
              {userRole && (
                <div className="inline-block px-4 py-2 rounded-full bg-rural-green text-white font-medium text-sm mx-auto">
                  {userRole}
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="w-auto px-6 mx-auto"
            >
              {t("profile-logout", language)}
            </Button>
          </Card>
        </div>

        {/* RIGHT COLUMN - Settings & Actions */}
        <div className="lg:col-span-2 lg:pr-20 flex flex-col gap-6">
          {/* Edit Profile Form */}
          {!isLoading && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-600 mb-6 uppercase tracking-wide">
                {t("profile-edit", language)}
              </h3>

              <div className="space-y-5">
                {/* Name field */}
                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    {t("profile-name", language)}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleEdit("name", e.target.value)}
                    placeholder={t("profile-name-ph", language)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                    disabled={isSaving}
                  />
                </div>

                {/* Phone number field */}
                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    {t("profile-phone", language)}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => handleEdit("phone_number", e.target.value)}
                    placeholder={t("profile-phone-ph", language)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                    disabled={isSaving}
                  />
                </div>

                {/* INTEGRATION: Role display (read-only) */}
                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    {t("profile-role", language)}
                  </label>
                  <p className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 bg-slate-50">
                    {formData.role || "—"}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    {t("profile-location", language)}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleEdit("location", e.target.value)}
                    placeholder={t("profile-location-ph", language)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                    disabled={isSaving}
                  />
                </div>

                {/* INTEGRATION: Farmer-specific fields */}
                {formData.role === "किसान" && (
                  <>
                    <div>
                      <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                        {t("profile-crop", language)}
                      </label>
                      <input
                        type="text"
                        value={formData.crop_preference}
                        onChange={(e) => handleEdit("crop_preference", e.target.value)}
                        placeholder={t("profile-crop-ph", language)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                        disabled={isSaving}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                        {t("profile-land", language)}
                      </label>
                      <input
                        type="number"
                        value={formData.land_size_acre}
                        onChange={(e) => handleEdit("land_size_acre", e.target.value)}
                        placeholder={t("profile-land-ph", language)}
                        inputMode="decimal"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                        disabled={isSaving}
                      />
                    </div>
                  </>
                )}

                {/* INTEGRATION: Student-specific fields */}
                {formData.role === "छात्र" && (
                  <>
                    <div>
                      <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                        {t("profile-field", language)}
                      </label>
                      <input
                        type="text"
                        value={formData.field_of_study}
                        onChange={(e) => handleEdit("field_of_study", e.target.value)}
                        placeholder={t("profile-field-ph", language)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                        disabled={isSaving}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                        {t("profile-interest", language)}
                      </label>
                      <input
                        type="text"
                        value={formData.interest_area}
                        onChange={(e) => handleEdit("interest_area", e.target.value)}
                        placeholder={t("profile-interest-ph", language)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                        disabled={isSaving}
                      />
                    </div>
                  </>
                )}

                {/* INTEGRATION: Worker-specific fields */}
                {formData.role === "मजदूर" && (
                  <div>
                    <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                      {t("profile-skill", language)}
                    </label>
                    <input
                      type="text"
                      value={formData.skill}
                      onChange={(e) => handleEdit("skill", e.target.value)}
                      placeholder={t("profile-skill-ph", language)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                      disabled={isSaving}
                    />
                  </div>
                )}

                <Button
                  size="md"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  isLoading={isSaving}
                  className="w-full"
                >
                  {t("profile-save", language)}
                </Button>
              </div>
            </Card>
          )}

        </div>
      </div>

      {/* Full width footer */}
      <div className="border-t border-slate-200 pt-8 text-center mt-12">
        <p className="text-sm font-semibold text-slate-900">Grameen AI Sahayak</p>
        <p className="text-xs text-slate-500 mt-1">v1.0.0 • © 2024</p>
      </div>

      {/* INTEGRATION: Language Toggler */}
      <LanguageToggle />
    </main>
  );
}
