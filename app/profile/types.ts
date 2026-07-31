export type Stamp = {
  id: string;
  title: string;
  country: string;
  completed_at?: string;
};

export type SubTabId =
  | "profile" | "pass" | "preferences" | "email" | "password"
  | "twofa" | "sessions" | "notifications" | "privacy" | "support" | "about";
