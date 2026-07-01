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
      admin_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string
          profile_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          profile_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          profile_a: string
          profile_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          profile_a: string
          profile_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          profile_a?: string
          profile_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          member_user_id: string
          profile_id: string
          role: Database["public"]["Enums"]["family_role"]
          status: Database["public"]["Enums"]["family_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          member_user_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["family_role"]
          status?: Database["public"]["Enums"]["family_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          member_user_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["family_role"]
          status?: Database["public"]["Enums"]["family_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string
          from_profile: string
          id: string
          message: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["interest_status"]
          to_profile: string
        }
        Insert: {
          created_at?: string
          from_profile: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
          to_profile: string
        }
        Update: {
          created_at?: string
          from_profile?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
          to_profile?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_from_profile_fkey"
            columns: ["from_profile"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interests_from_profile_fkey"
            columns: ["from_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interests_to_profile_fkey"
            columns: ["to_profile"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interests_to_profile_fkey"
            columns: ["to_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_reason: Json
          ai_score: number
          computed_at: string
          id: string
          profile_a: string
          profile_b: string
        }
        Insert: {
          ai_reason?: Json
          ai_score: number
          computed_at?: string
          id?: string
          profile_a: string
          profile_b: string
        }
        Update: {
          ai_reason?: Json
          ai_score?: number
          computed_at?: string
          id?: string
          profile_a?: string
          profile_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          is_private: boolean
          moderation: Database["public"]["Enums"]["photo_moderation"]
          profile_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          is_private?: boolean
          moderation?: Database["public"]["Enums"]["photo_moderation"]
          profile_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          is_private?: boolean
          moderation?: Database["public"]["Enums"]["photo_moderation"]
          profile_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          annual_income_inr: number | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          diet: Database["public"]["Enums"]["diet"] | null
          display_name: string
          drinking: string | null
          education: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          gotra: string | null
          guru_lineage: string | null
          height_cm: number | null
          id: string
          is_verified: boolean
          ishtalinga_practicing: boolean | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          mother_tongue: string | null
          native_district: string | null
          on_behalf_of: Database["public"]["Enums"]["on_behalf_of"] | null
          onboarding_complete: boolean
          partner_expectations: Json | null
          phone: string | null
          phone_verified: boolean
          profession: string | null
          smoking: string | null
          state: string | null
          status: Database["public"]["Enums"]["profile_status"]
          sub_sect: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          annual_income_inr?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet?: Database["public"]["Enums"]["diet"] | null
          display_name: string
          drinking?: string | null
          education?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gotra?: string | null
          guru_lineage?: string | null
          height_cm?: number | null
          id: string
          is_verified?: boolean
          ishtalinga_practicing?: boolean | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          mother_tongue?: string | null
          native_district?: string | null
          on_behalf_of?: Database["public"]["Enums"]["on_behalf_of"] | null
          onboarding_complete?: boolean
          partner_expectations?: Json | null
          phone?: string | null
          phone_verified?: boolean
          profession?: string | null
          smoking?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          sub_sect?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          annual_income_inr?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet?: Database["public"]["Enums"]["diet"] | null
          display_name?: string
          drinking?: string | null
          education?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gotra?: string | null
          guru_lineage?: string | null
          height_cm?: number | null
          id?: string
          is_verified?: boolean
          ishtalinga_practicing?: boolean | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          mother_tongue?: string | null
          native_district?: string | null
          on_behalf_of?: Database["public"]["Enums"]["on_behalf_of"] | null
          onboarding_complete?: boolean
          partner_expectations?: Json | null
          phone?: string | null
          phone_verified?: boolean
          profession?: string | null
          smoking?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          sub_sect?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_profile: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_profile: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_profile?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_profile_fkey"
            columns: ["reported_profile"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_profile_fkey"
            columns: ["reported_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlists: {
        Row: {
          created_at: string
          id: string
          note: string | null
          owner_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          owner_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_inr: number
          created_at: string
          expires_at: string | null
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["sub_status"]
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          created_at: string
          evidence_url: string | null
          id: string
          notes: string | null
          profile_id: string
          status: Database["public"]["Enums"]["verification_status"]
          type: Database["public"]["Enums"]["verification_type"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["verification_status"]
          type: Database["public"]["Enums"]["verification_type"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["verification_status"]
          type?: Database["public"]["Enums"]["verification_type"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "my_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_contact: {
        Row: {
          id: string | null
          phone: string | null
          phone_verified: boolean | null
        }
        Insert: {
          id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
        }
        Update: {
          id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_active_tier: {
        Args: { _user: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      open_conversation: { Args: { _other: string }; Returns: string }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin"
      diet: "vegetarian" | "vegan" | "eggetarian" | "non_vegetarian"
      family_role: "parent" | "sibling" | "relative" | "matchmaker"
      family_status: "pending" | "accepted" | "revoked"
      gender: "male" | "female"
      interest_status: "sent" | "accepted" | "declined" | "withdrawn"
      marital_status:
        | "never_married"
        | "divorced"
        | "widowed"
        | "awaiting_divorce"
      on_behalf_of: "self" | "son" | "daughter" | "sibling" | "relative"
      photo_moderation: "pending" | "approved" | "rejected"
      plan_tier: "free" | "premium" | "elite"
      profile_status: "draft" | "pending" | "active" | "hidden" | "banned"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      sub_status: "pending" | "active" | "expired" | "cancelled" | "failed"
      verification_status: "pending" | "approved" | "rejected"
      verification_type: "mobile" | "email" | "id" | "selfie" | "face_match"
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
    Enums: {
      app_role: ["user", "moderator", "admin"],
      diet: ["vegetarian", "vegan", "eggetarian", "non_vegetarian"],
      family_role: ["parent", "sibling", "relative", "matchmaker"],
      family_status: ["pending", "accepted", "revoked"],
      gender: ["male", "female"],
      interest_status: ["sent", "accepted", "declined", "withdrawn"],
      marital_status: [
        "never_married",
        "divorced",
        "widowed",
        "awaiting_divorce",
      ],
      on_behalf_of: ["self", "son", "daughter", "sibling", "relative"],
      photo_moderation: ["pending", "approved", "rejected"],
      plan_tier: ["free", "premium", "elite"],
      profile_status: ["draft", "pending", "active", "hidden", "banned"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      sub_status: ["pending", "active", "expired", "cancelled", "failed"],
      verification_status: ["pending", "approved", "rejected"],
      verification_type: ["mobile", "email", "id", "selfie", "face_match"],
    },
  },
} as const
