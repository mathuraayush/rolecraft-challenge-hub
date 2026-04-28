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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      portfolios: {
        Row: {
          created_at: string
          headline: string | null
          is_available_for_hire: boolean
          is_public: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          headline?: string | null
          is_available_for_hire?: boolean
          is_public?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          headline?: string | null
          is_available_for_hire?: boolean
          is_public?: boolean
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          context: string | null
          created_at: string
          deliverables: string | null
          difficulty_level: string | null
          domain: string | null
          evaluation_rubric: string | null
          focus_area: string | null
          id: string
          problem_statement: string
          role_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          deliverables?: string | null
          difficulty_level?: string | null
          domain?: string | null
          evaluation_rubric?: string | null
          focus_area?: string | null
          id?: string
          problem_statement: string
          role_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          deliverables?: string | null
          difficulty_level?: string | null
          domain?: string | null
          evaluation_rubric?: string | null
          focus_area?: string | null
          id?: string
          problem_statement?: string
          role_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiters: {
        Row: {
          company: string
          company_size: string | null
          created_at: string
          email: string
          hiring_for_role: string | null
          id: string
          name: string
          saved_searches: Json | null
          user_id: string | null
        }
        Insert: {
          company: string
          company_size?: string | null
          created_at?: string
          email: string
          hiring_for_role?: string | null
          id?: string
          name: string
          saved_searches?: Json | null
          user_id?: string | null
        }
        Update: {
          company?: string
          company_size?: string | null
          created_at?: string
          email?: string
          hiring_for_role?: string | null
          id?: string
          name?: string
          saved_searches?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string
          icon_emoji: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description: string
          icon_emoji: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          icon_emoji?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_feedback: string | null
          ai_meta: Json | null
          ai_score: number | null
          approach_text: string | null
          created_at: string
          fetched_content: string | null
          id: string
          problem_understanding: string | null
          project_id: string
          proposed_solution: string | null
          reflection_text: string | null
          status: string
          submission_link: string | null
          submission_type: string | null
          success_metrics: string | null
          tradeoffs: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_meta?: Json | null
          ai_score?: number | null
          approach_text?: string | null
          created_at?: string
          fetched_content?: string | null
          id?: string
          problem_understanding?: string | null
          project_id: string
          proposed_solution?: string | null
          reflection_text?: string | null
          status?: string
          submission_link?: string | null
          submission_type?: string | null
          success_metrics?: string | null
          tradeoffs?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_meta?: Json | null
          ai_score?: number | null
          approach_text?: string | null
          created_at?: string
          fetched_content?: string | null
          id?: string
          problem_understanding?: string | null
          project_id?: string
          proposed_solution?: string | null
          reflection_text?: string | null
          status?: string
          submission_link?: string | null
          submission_type?: string | null
          success_metrics?: string | null
          tradeoffs?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          city: string | null
          college: string | null
          created_at: string
          email: string | null
          github_url: string | null
          id: string
          level: string | null
          linkedin_url: string | null
          name: string | null
          onboarded: boolean
          role: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          college?: string | null
          created_at?: string
          email?: string | null
          github_url?: string | null
          id: string
          level?: string | null
          linkedin_url?: string | null
          name?: string | null
          onboarded?: boolean
          role?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          college?: string | null
          created_at?: string
          email?: string | null
          github_url?: string | null
          id?: string
          level?: string | null
          linkedin_url?: string | null
          name?: string | null
          onboarded?: boolean
          role?: string | null
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
