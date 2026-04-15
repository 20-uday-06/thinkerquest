"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";
import { loginWithPhone } from "@/lib/api";
import LanguageToggle from "@/components/LanguageToggle";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const { language, setCurrentUserPhone, setIsNewUser, setHasCompletedOnboarding, setUserRole } =
    useAppContext();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
    if (error) setError("");
  };

  const validatePhone = (): boolean => {
    if (!phone || phone.length !== 10) {
      setError(
        language === "hi"
          ? "कृपया 10 अंकों का नंबर दर्ज करें"
          : "Please enter 10-digit number"
      );
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validatePhone()) return;

    setLoading(true);
    setError("");

    try {
      const response = await loginWithPhone(phone);

      // Store user info in context
      setCurrentUserPhone(response.profile.phone_number);
      setIsNewUser(response.is_new_user);
      setHasCompletedOnboarding(response.profile.has_completed_onboarding);
      if (response.profile.role) {
        setUserRole(response.profile.role as "किसान" | "छात्र" | "मजदूर");
      }

      // Route based on user type
      if (response.is_new_user || !response.profile.has_completed_onboarding) {
        router.push("/user-selection");
      } else {
        router.push("/");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(
        errorMsg.includes("network")
          ? language === "hi"
            ? "नेटवर्क त्रुटि। कृपया फिर से कोशिश करें"
            : "Network error. Please retry"
          : errorMsg.includes("404")
            ? language === "hi"
              ? "उपयोगकर्ता नहीं मिला"
              : "User not found"
            : language === "hi"
              ? "सर्वर में समस्या। कृपया बाद में कोशिश करें"
              : "Server error. Please try later"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-green-700">
              {language === "hi" ? "ग्रामीण सहायक" : "Rural Assistant"}
            </h1>
            <p className="text-gray-600">
              {language === "hi"
                ? "अपना फोन नंबर दर्ज करें"
                : "Enter Your Phone Number"}
            </p>
          </div>

          {/* Explanation text */}
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="text-sm text-gray-700">
              {language === "hi"
                ? "नए उपयोगकर्ता या वापसी - एक ही नंबर से लॉगिन करें"
                : "New or returning user - login with one phone number"}
            </p>
          </div>

          {/* Phone input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {language === "hi" ? "फोन नंबर" : "Phone Number"}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              onKeyPress={handleKeyPress}
              placeholder={
                language === "hi" ? "10 अंकों का नंबर" : "10-digit number"
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-lg font-semibold tracking-widest"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              {language === "hi"
                ? "उदाहरण: 9876543210"
                : "Example: 9876543210"}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading message */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-700">
                {language === "hi"
                  ? "सत्यापन हो रहा है..."
                  : "Verifying..."}
              </p>
            </div>
          )}

          {/* Login button */}
          <Button
            onClick={handleLogin}
            disabled={loading || phone.length !== 10}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {language === "hi" ? "आगे बढ़ें" : "Continue"}
          </Button>

          {/* Info text */}
          <p className="text-xs text-center text-gray-500">
            {language === "hi"
              ? "आपका डेटा सुरक्षित रहता है। कोई पासवर्ड आवश्यक नहीं है।"
              : "Your data is safe. No password needed."}
          </p>
        </div>

        {/* Language toggle */}
        <div className="mt-6">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
