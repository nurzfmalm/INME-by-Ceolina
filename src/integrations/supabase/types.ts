export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adaptive_assessments: {
        Row: {
          assessment_data: Json
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          total_steps: number | null
          user_id: string
        }
        Insert: {
          assessment_data: Json
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          total_steps?: number | null
          user_id: string
        }
        Update: {
          assessment_data?: Json
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          total_steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          completion_percentage: number | null
          current_week: number | null
          id: string
          last_activity: string | null
          path_data: Json
          started_at: string | null
          total_weeks: number | null
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          current_week?: number | null
          id?: string
          last_activity?: string | null
          path_data: Json
          started_at?: string | null
          total_weeks?: number | null
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          current_week?: number | null
          id?: string
          last_activity?: string | null
          path_data?: Json
          started_at?: string | null
          total_weeks?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          child_age: number | null
          child_name: string
          created_at: string | null
          id: string
          parent_email: string | null
          updated_at: string | null
        }
        Insert: {
          child_age?: number | null
          child_name: string
          created_at?: string | null
          id: string
          parent_email?: string | null
          updated_at?: string | null
        }
        Update: {
          child_age?: number | null
          child_name?: string
          created_at?: string | null
          id?: string
          parent_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_tracking: {
        Row: {
          id: string
          metric_type: string
          metric_value: number
          recorded_at: string | null
          user_id: string
          week_number: number
        }
        Insert: {
          id?: string
          metric_type: string
          metric_value: number
          recorded_at?: string | null
          user_id: string
          week_number: number
        }
        Update: {
          id?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string | null
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      sensory_settings: {
        Row: {
          animation_speed: number | null
          color_scheme: string | null
          created_at: string | null
          hint_frequency: number | null
          id: string
          interface_complexity: string | null
          quiet_mode: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
          visual_intensity: number | null
        }
        Insert: {
          animation_speed?: number | null
          color_scheme?: string | null
          created_at?: string | null
          hint_frequency?: number | null
          id?: string
          interface_complexity?: string | null
          quiet_mode?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          visual_intensity?: number | null
        }
        Update: {
          animation_speed?: number | null
          color_scheme?: string | null
          created_at?: string | null
          hint_frequency?: number | null
          id?: string
          interface_complexity?: string | null
          quiet_mode?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          visual_intensity?: number | null
        }
        Relationships: []
      }
      session_analytics: {
        Row: {
          color_choices: Json | null
          completion_status: string | null
          created_at: string | null
          duration_seconds: number | null
          emotional_markers: Json | null
          id: string
          reaction_times: Json | null
          sensory_activity: Json | null
          session_type: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          color_choices?: Json | null
          completion_status?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          emotional_markers?: Json | null
          id?: string
          reaction_times?: Json | null
          sensory_activity?: Json | null
          session_type: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          color_choices?: Json | null
          completion_status?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          emotional_markers?: Json | null
          id?: string
          reaction_times?: Json | null
          sensory_activity?: Json | null
          session_type?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
