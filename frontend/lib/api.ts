import type {
  AdvisoryResponse,
  SyncResponse,
  SyncEventItem,
  UserProfile,
  VoiceTtsResponse,
} from "@/lib/types";

export interface LoginResponse {
  user_id: number;
  profile: UserProfile;
  is_new_user: boolean;
}

export interface CheckPhoneResponse {
  exists: boolean;
  profile?: UserProfile;
  is_new_user: boolean;
}

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const fromWindow = (window as Window & { __API_BASE_URL__?: string }).__API_BASE_URL__;
    if (fromWindow && fromWindow.trim()) {
      return fromWindow.trim();
    }
  }

  return "http://localhost:8000";
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "नेटवर्क त्रुटि");
  }

  return (await response.json()) as T;
}

export async function getProfile(phoneNumber?: string): Promise<UserProfile> {
  const params = phoneNumber ? `?phone_number=${encodeURIComponent(phoneNumber)}` : "";
  return requestJson<UserProfile>(`/api/profile${params}`, { method: "GET" });
}

export async function updateProfile(payload: {
  name?: string;
  phone_number?: string;
  location: string;
  land_size_acre: number;
  crop_preference: string;
  role?: string;
  has_completed_onboarding?: boolean;
  farm_type?: string;
  field_of_study?: string;
  interest_area?: string;
  skill?: string;
  worker_location?: string;
}, phoneNumber: string): Promise<UserProfile> {
  return requestJson<UserProfile>(`/api/profile?phone_number=${encodeURIComponent(phoneNumber)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function queryAdvisory(text: string): Promise<AdvisoryResponse> {
  return requestJson<AdvisoryResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function syncEvents(events: SyncEventItem[]): Promise<SyncResponse> {
  if (events.length === 0) {
    return {
      accepted: 0,
      ignored: 0,
      server_timestamp: new Date().toISOString(),
    };
  }

  return requestJson<SyncResponse>("/api/sync", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}

export async function synthesizeSpeech(text: string): Promise<VoiceTtsResponse> {
  return requestJson<VoiceTtsResponse>("/api/voice/tts", {
    method: "POST",
    body: JSON.stringify({ text, language: "hi" }),
  });
}

// INTEGRATION: Onboarding API
export async function completeOnboarding(payload: {
  name: string;
  phone_number: string;
  role: string;
  location: string;
  crop?: string;
  land_size?: number;
  field?: string;
  interest?: string;
  skill?: string;
}): Promise<UserProfile> {
  return requestJson<UserProfile>("/api/onboarding/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// AUTH APIs
export async function loginWithPhone(phoneNumber: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
}

export async function checkPhoneExists(phoneNumber: string): Promise<CheckPhoneResponse> {
  return requestJson<CheckPhoneResponse>(
    `/api/auth/check-phone/${encodeURIComponent(phoneNumber)}`,
    { method: "GET" }
  );
}

export async function logoutUser(): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}
