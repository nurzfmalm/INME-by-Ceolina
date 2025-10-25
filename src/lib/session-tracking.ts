import { supabase } from "@/integrations/supabase/client";

interface SessionTrackingData {
  sessionType: string;
  taskId?: string;
  durationSeconds?: number;
  completionStatus?: string;
  reactionTimes?: number[];
  colorChoices?: string[];
  emotionalMarkers?: Record<string, any>;
  sensoryActivity?: Record<string, any>;
}

export class SessionTracker {
  private sessionId: string | null = null;
  private startTime: number = 0;
  private reactionTimes: number[] = [];
  private colorChoices: string[] = [];
  private interactionTimestamp: number = 0;

  constructor(private sessionType: string, private taskId?: string) {}

  async start() {
    this.startTime = Date.now();
    this.sessionId = `session-${this.startTime}`;
    this.interactionTimestamp = Date.now();
    return this.sessionId;
  }

  recordInteraction() {
    const now = Date.now();
    const reactionTime = now - this.interactionTimestamp;
    this.reactionTimes.push(reactionTime);
    this.interactionTimestamp = now;
  }

  recordColorChoice(color: string) {
    this.colorChoices.push(color);
  }

  async complete(
    completionStatus: "completed" | "incomplete" | "skipped" = "completed",
    emotionalMarkers?: Record<string, any>,
    sensoryActivity?: Record<string, any>
  ) {
    const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const sessionData: SessionTrackingData = {
        sessionType: this.sessionType,
        taskId: this.taskId,
        durationSeconds,
        completionStatus,
        reactionTimes: this.reactionTimes.length > 0 ? this.reactionTimes : undefined,
        colorChoices: this.colorChoices.length > 0 ? this.colorChoices : undefined,
        emotionalMarkers,
        sensoryActivity,
      };

      if (userData.user) {
        // Save to database
        const { error } = await supabase.from("session_analytics").insert({
          user_id: userData.user.id,
          session_type: sessionData.sessionType,
          task_id: sessionData.taskId,
          duration_seconds: sessionData.durationSeconds,
          completion_status: sessionData.completionStatus,
          reaction_times: sessionData.reactionTimes,
          color_choices: sessionData.colorChoices,
          emotional_markers: sessionData.emotionalMarkers,
          sensory_activity: sessionData.sensoryActivity,
        });

        if (error) throw error;

        // Also save to progress_sessions for backward compatibility
        await supabase.from("progress_sessions").insert({
          user_id: userData.user.id,
          session_type: sessionData.sessionType,
          duration_seconds: sessionData.durationSeconds,
          metadata: {
            reaction_times: sessionData.reactionTimes,
            color_choices: sessionData.colorChoices,
          },
        });
      } else {
        // Save to localStorage for guest users
        const localSessions = JSON.parse(
          localStorage.getItem("sessionAnalytics") || "[]"
        );
        localSessions.push({
          ...sessionData,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("sessionAnalytics", JSON.stringify(localSessions));
      }

      return sessionData;
    } catch (error) {
      console.error("Error saving session analytics:", error);
      throw error;
    }
  }

  getStats() {
    return {
      averageReactionTime:
        this.reactionTimes.length > 0
          ? this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length
          : 0,
      totalInteractions: this.reactionTimes.length,
      uniqueColors: new Set(this.colorChoices).size,
      duration: Date.now() - this.startTime,
    };
  }
}
