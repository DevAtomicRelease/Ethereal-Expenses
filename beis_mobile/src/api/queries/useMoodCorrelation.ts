import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";

export interface MoodCorrelationResponse {
  has_data: boolean;
  message?: string;
  moods?: Record<string, {
    avg_spend: number;
    total_spend: number;
    count: number;
  }>;
  highest_mood?: string | null;
  total_mood_tagged?: number;
}

export function useMoodCorrelation() {
  return useQuery<MoodCorrelationResponse>({
    queryKey: ["mood-correlation"],
    queryFn: async () => intelligenceClient.get("insights/mood-correlation").json(),
    staleTime: 15 * 60 * 1000,
  });
}
