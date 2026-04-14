"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import { getProfile, updateProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { userRole, setUserRole, setHasCompletedOnboarding, language } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    location: "",
    land_size_acre: "",
    crop_preference: "",
  });

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profile = await getProfile();
        setProfileData(profile);
        setFormData({
          location: profile.location,
          land_size_acre: profile.land_size_acre.toString(),
          crop_preference: profile.crop_preference,
        });
        setStatus("प्रोफ़ाइल लोड हो गई");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "प्रोफ़ाइल लोड करने में त्रुटि";
        setError(errorMsg);
        setStatus(errorMsg);
        // Set some default values if API fails
        setFormData({
          location: "आपका स्थान",
          land_size_acre: "5",
          crop_preference: "गेहूं",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

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
      const updated = await updateProfile({
        location: formData.location.trim(),
        land_size_acre: landValue,
        crop_preference: formData.crop_preference.trim(),
      });

      setProfileData(updated);
      setStatus("✓ प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई");

      setTimeout(() => {
        setStatus("");
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "प्रोफ़ाइल अपडेट करने में त्रुटि";
      setError(errorMsg);
      setStatus(errorMsg);
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
          <h1 className="text-3xl font-bold text-slate-900">आपकी प्रोफ़ाइल</h1>
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
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Avatar Card */}
          <Card className="text-center bg-gradient-to-br from-rural-greenLight to-rural-cream">
            <div className="text-7xl mb-4">👤</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">नमस्ते</h2>
            {userRole && (
              <div className="inline-block px-4 py-2 rounded-full bg-rural-green text-white font-medium text-sm">
                {userRole}
              </div>
            )}
          </Card>

          {/* Profile Details */}
          {isLoading ? (
            <Card className="text-center">
              <p className="text-sm text-slate-600">लोड हो रहा है...</p>
            </Card>
          ) : (
            <Card>
              <h3 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">
                विवरण
              </h3>

              <div className="space-y-4">
                <div className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <p className="text-xs text-slate-500 font-medium mb-1">स्थान</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formData.location || "—"}
                  </p>
                </div>

                <div className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <p className="text-xs text-slate-500 font-medium mb-1">भूमि</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formData.land_size_acre || "—"} एकड़
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">फसल</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formData.crop_preference || "—"}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN - Settings & Actions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Edit Profile Form */}
          {!isLoading && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-600 mb-6 uppercase tracking-wide">
                प्रोफ़ाइल संपादित करें
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    स्थान
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleEdit("location", e.target.value)}
                    placeholder="जैसे: उत्तर प्रदेश"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    भूमि का आकार (एकड़)
                  </label>
                  <input
                    type="number"
                    value={formData.land_size_acre}
                    onChange={(e) => handleEdit("land_size_acre", e.target.value)}
                    placeholder="जैसे: 5"
                    inputMode="decimal"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2 block">
                    पसंदीदा फसल
                  </label>
                  <input
                    type="text"
                    value={formData.crop_preference}
                    onChange={(e) => handleEdit("crop_preference", e.target.value)}
                    placeholder="जैसे: गेहूं"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green focus:ring-1 focus:ring-rural-green transition-all"
                    disabled={isSaving}
                  />
                </div>

                <Button
                  size="md"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  isLoading={isSaving}
                  className="w-full"
                >
                  💾 सेव करें
                </Button>
              </div>
            </Card>
          )}

          {/* Logout Button - Centered */}
          <div className="flex justify-center pt-8">
            <Button
              variant="secondary"
              size="md"
              onClick={handleLogout}
              className="w-auto px-8"
            >
              🚪 लॉग आउट
            </Button>
          </div>
        </div>
      </div>

      {/* Full width footer */}
      <div className="border-t border-slate-200 pt-8 text-center mt-12">
        <p className="text-sm font-semibold text-slate-900">Grameen AI Sahayak</p>
        <p className="text-xs text-slate-500 mt-1">v1.0.0 • © 2024</p>
      </div>
    </main>
  );
}
