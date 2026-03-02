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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          dark_mode: boolean
          id: string
          notifications_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dark_mode?: boolean
          id?: string
          notifications_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dark_mode?: boolean
          id?: string
          notifications_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          id: string
          name: string
          name_ar: string
          potassium: number
          protein: number
          sodium: number
          sugar: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          name: string
          name_ar?: string
          potassium?: number
          protein?: number
          sodium?: number
          sugar?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          name?: string
          name_ar?: string
          potassium?: number
          protein?: number
          sodium?: number
          sugar?: number
          user_id?: string
        }
        Relationships: []
      }
      custom_lab_tests: {
        Row: {
          created_at: string
          id: string
          key: string
          max: number
          min: number
          name: string
          name_ar: string
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          max?: number
          min?: number
          name: string
          name_ar?: string
          unit?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          max?: number
          min?: number
          name?: string
          name_ar?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      food_log: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          date: string
          fat: number
          food_name: string
          id: string
          meal: string
          potassium: number
          protein: number
          sodium: number
          sugar: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          date: string
          fat?: number
          food_name: string
          id?: string
          meal?: string
          potassium?: number
          protein?: number
          sodium?: number
          sugar?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          date?: string
          fat?: number
          food_name?: string
          id?: string
          meal?: string
          potassium?: number
          protein?: number
          sodium?: number
          sugar?: number
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          mood: number
          notes: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mood?: number
          notes?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mood?: number
          notes?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string
          status: string
          test_key: string
          test_name: string
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string
          status?: string
          test_key: string
          test_name: string
          unit?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string
          status?: string
          test_key?: string
          test_name?: string
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          breakfast: string[]
          created_at: string
          day: string
          dinner: string[]
          id: string
          lunch: string[]
          snack: string[]
          user_id: string
        }
        Insert: {
          breakfast?: string[]
          created_at?: string
          day: string
          dinner?: string[]
          id?: string
          lunch?: string[]
          snack?: string[]
          user_id: string
        }
        Update: {
          breakfast?: string[]
          created_at?: string
          day?: string
          dinner?: string[]
          id?: string
          lunch?: string[]
          snack?: string[]
          user_id?: string
        }
        Relationships: []
      }
      medication_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          medication_id: string
          status: string
          time: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          medication_id: string
          status?: string
          time: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          medication_id?: string
          status?: string
          time?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          dose: string
          end_date: string
          first_dose_date_time: string | null
          form: string
          frequency: string
          id: string
          interval_hours: number | null
          interval_unit: string | null
          monthly_day: number | null
          name: string
          notes: string
          specific_days: string[] | null
          start_date: string
          times: string[]
          user_id: string
          weekly_day: string | null
        }
        Insert: {
          created_at?: string
          dose?: string
          end_date?: string
          first_dose_date_time?: string | null
          form?: string
          frequency?: string
          id?: string
          interval_hours?: number | null
          interval_unit?: string | null
          monthly_day?: number | null
          name: string
          notes?: string
          specific_days?: string[] | null
          start_date?: string
          times?: string[]
          user_id: string
          weekly_day?: string | null
        }
        Update: {
          created_at?: string
          dose?: string
          end_date?: string
          first_dose_date_time?: string | null
          form?: string
          frequency?: string
          id?: string
          interval_hours?: number | null
          interval_unit?: string | null
          monthly_day?: number | null
          name?: string
          notes?: string
          specific_days?: string[] | null
          start_date?: string
          times?: string[]
          user_id?: string
          weekly_day?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number
          blood_type: string
          bmi: number
          conditions: string[]
          created_at: string
          custom_conditions: string[]
          daily_calories: number
          doctor_name: string
          emergency_number: string
          gender: string
          height: number
          id: string
          name: string
          surgeries: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          age?: number
          blood_type?: string
          bmi?: number
          conditions?: string[]
          created_at?: string
          custom_conditions?: string[]
          daily_calories?: number
          doctor_name?: string
          emergency_number?: string
          gender?: string
          height?: number
          id?: string
          name?: string
          surgeries?: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          age?: number
          blood_type?: string
          bmi?: number
          conditions?: string[]
          created_at?: string
          custom_conditions?: string[]
          daily_calories?: number
          doctor_name?: string
          emergency_number?: string
          gender?: string
          height?: number
          id?: string
          name?: string
          surgeries?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      side_effects: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          medication_id: string
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string
          id?: string
          medication_id: string
          severity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          medication_id?: string
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "side_effects_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      water_log: {
        Row: {
          date: string
          glasses: number
          id: string
          user_id: string
        }
        Insert: {
          date: string
          glasses?: number
          id?: string
          user_id: string
        }
        Update: {
          date?: string
          glasses?: number
          id?: string
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
