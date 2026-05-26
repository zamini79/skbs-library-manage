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
      admins: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_login_at: string | null
          login_id: string
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          login_id: string
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          login_id?: string
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string
          available_quantity: number
          category: Database["public"]["Enums"]["book_category"]
          cover_url: string | null
          cover_url_external: string | null
          created_at: string
          created_by: string | null
          description: string | null
          disposal_reason: Database["public"]["Enums"]["disposal_reason"] | null
          disposed_at: string | null
          id: string
          isbn: string | null
          price: number
          publisher: string
          status: Database["public"]["Enums"]["book_status"]
          title: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          author: string
          available_quantity?: number
          category: Database["public"]["Enums"]["book_category"]
          cover_url?: string | null
          cover_url_external?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disposal_reason?:
            | Database["public"]["Enums"]["disposal_reason"]
            | null
          disposed_at?: string | null
          id?: string
          isbn?: string | null
          price?: number
          publisher: string
          status?: Database["public"]["Enums"]["book_status"]
          title: string
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          author?: string
          available_quantity?: number
          category?: Database["public"]["Enums"]["book_category"]
          cover_url?: string | null
          cover_url_external?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disposal_reason?:
            | Database["public"]["Enums"]["disposal_reason"]
            | null
          disposed_at?: string | null
          id?: string
          isbn?: string | null
          price?: number
          publisher?: string
          status?: Database["public"]["Enums"]["book_status"]
          title?: string
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_deletions: {
        Row: {
          deleted_at: string
          email: string
        }
        Insert: {
          deleted_at?: string
          email: string
        }
        Update: {
          deleted_at?: string
          email?: string
        }
        Relationships: []
      }
      mileage_history: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: Database["public"]["Enums"]["mileage_reason"]
          rental_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: Database["public"]["Enums"]["mileage_reason"]
          rental_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: Database["public"]["Enums"]["mileage_reason"]
          rental_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_history_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_requests: {
        Row: {
          book_id: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reject_reason: string | null
          rental_id: string | null
          requested_at: string
          status: Database["public"]["Enums"]["rental_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reject_reason?: string | null
          rental_id?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["rental_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reject_reason?: string | null
          rental_id?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["rental_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          admin_id: string
          book_id: string
          created_at: string
          due_date: string
          id: string
          rented_at: string
          return_admin_id: string | null
          returned_at: string | null
          status: Database["public"]["Enums"]["rental_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          book_id: string
          created_at?: string
          due_date: string
          id?: string
          rented_at?: string
          return_admin_id?: string | null
          returned_at?: string | null
          status?: Database["public"]["Enums"]["rental_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          book_id?: string
          created_at?: string
          due_date?: string
          id?: string
          rented_at?: string
          return_admin_id?: string | null
          returned_at?: string | null
          status?: Database["public"]["Enums"]["rental_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_return_admin_id_fkey"
            columns: ["return_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          consent_given_at: string
          created_at: string
          department: string
          email: string
          employee_no: string
          id: string
          is_active: boolean
          mileage: number
          name: string
          updated_at: string
        }
        Insert: {
          consent_given_at?: string
          created_at?: string
          department: string
          email: string
          employee_no: string
          id: string
          is_active?: boolean
          mileage?: number
          name: string
          updated_at?: string
        }
        Update: {
          consent_given_at?: string
          created_at?: string
          department?: string
          email?: string
          employee_no?: string
          id?: string
          is_active?: boolean
          mileage?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rental_eligibility: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: Json
      }
      is_book_requested: { Args: { p_book_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_overdue_rentals: { Args: never; Returns: number }
    }
    Enums: {
      admin_role: "master" | "book"
      book_category:
        | "철학/종교/인문"
        | "사회과학"
        | "음반"
        | "문학"
        | "역사/여행"
      book_status: "active" | "disposed"
      disposal_reason: "lost" | "damaged" | "outdated" | "other"
      mileage_reason: "return_on_time" | "return_overdue"
      rental_request_status: "pending" | "approved" | "rejected"
      rental_status: "active" | "returned" | "overdue"
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
      admin_role: ["master", "book"],
      book_category: [
        "철학/종교/인문",
        "사회과학",
        "음반",
        "문학",
        "역사/여행",
      ],
      book_status: ["active", "disposed"],
      disposal_reason: ["lost", "damaged", "outdated", "other"],
      mileage_reason: ["return_on_time", "return_overdue"],
      rental_request_status: ["pending", "approved", "rejected"],
      rental_status: ["active", "returned", "overdue"],
    },
  },
} as const
