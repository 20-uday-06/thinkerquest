export type UserProfile = {
  id: number;
  name?: string;
  phone_number?: string;
  role?: string;
  has_completed_onboarding?: boolean;
  location: string;
  land_size_acre: number;
  crop_preference: string;
  farm_type?: string;
  field_of_study?: string;
  interest_area?: string;
  skill?: string;
  worker_location?: string;
  updated_at: string;
};

export type AdvisoryResponse = {
  answer: string;
  mode: string;
  language: string;
  generated_at: string;
  sources: string[];
};

export type SyncEventItem = {
  client_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  client_timestamp: string;
};

export type VoiceTtsResponse = {
  audio_base64: string;
  mime_type: string;
  mode: string;
};

export type SyncResponse = {
  accepted: number;
  ignored: number;
  server_timestamp: string;
};
