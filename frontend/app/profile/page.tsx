"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import { getProfile, updateProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
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
  };

  return (
    <main className="min-h-screen w-full flex flex-col p-4 pb-safe bg-gradient-to-b from-rural-cream via-rural-greenLight to-rural-cream safe-area">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">आपकी प्रोफ़ाइल</h1>
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

      {/* Avatar and name */}
      <Card className="mb-6 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">नमस्ते</h2>
        {userRole && (
          <div className="inline-block px-4 py-2 rounded-full bg-rural-greenLight text-rural-greenDark font-medium text-sm">
            {userRole}
          </div>
        )}
      </Card>

      {/* Profile information */}
      {isLoading ? (
        <Card className="mb-6 text-center">
          <p className="text-sm text-slate-600">लोड हो रहा है...</p>
        </Card>
      ) : (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            व्यक्तिगत जानकारी
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 font-medium">स्थान:</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleEdit("location", e.target.value)}
                placeholder="जैसे: उत्तर प्रदेश"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green transition-colors"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600 font-medium">
                भूमि का आकार (एकड़):
              </label>
              <input
                type="number"
                value={formData.land_size_acre}
                onChange={(e) => handleEdit("land_size_acre", e.target.value)}
                placeholder="जैसे: 5"
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green transition-colors"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600 font-medium">
                पसंदीदा फसल:
              </label>
              <input
                type="text"
                value={formData.crop_preference}
                onChange={(e) => handleEdit("crop_preference", e.target.value)}
                placeholder="जैसे: गेहूं"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rural-green transition-colors"
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
              💾 प्रोफ़ाइल सेव करें
            </Button>
          </div>

          {profileData && (
            <p className="mt-4 text-xs text-slate-500 border-t pt-4">
              <strong>वर्तमान प्रोफ़ाइल:</strong> {profileData.location}, {profileData.land_size_acre} एकड़,{" "}
              {profileData.crop_preference}
            </p>
          )}
        </Card>
      )}

      {/* Settings */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">सेटिंग्स</h3>

        <div className="space-y-3">
          <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">🔔 सूचनाएं</span>
            <span className="text-lg">→</span>
          </button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">🗣️ भाषा</span>
            <span className="text-sm text-slate-600">हिंदी</span>
          </button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">🔒 गोपनीयता</span>
            <span className="text-lg">→</span>
          </button>
        </div>
      </Card>

      {/* About */}
      <Card className="mb-6 bg-blue-50">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Grameen AI Sahayak</h3>
        <p className="text-xs text-blue-800">v1.0.0</p>
        <p className="text-xs text-blue-700 mt-2">
          © 2024 - सभी अधिकार सुरक्षित
        </p>
      </Card>

      {/* Logout button */}
      <Button
        variant="secondary"
        size="lg"
        onClick={handleLogout}
        className="w-full mb-4"
      >
        🚪 लॉग आउट करें
      </Button>

      {/* Home button */}
      <Link href="/">
        <Button size="lg" className="w-full">
          🏠 होम पेज
        </Button>
      </Link>
    </main>
  );
}
