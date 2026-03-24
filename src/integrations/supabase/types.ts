export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Staff = Database['public']['Tables']['staff']['Row'];
export type StaffInsert = Database['public']['Tables']['staff']['Insert'];
export type StaffUpdate = Database['public']['Tables']['staff']['Update'];

export type DeliveryCompletion = Database['public']['Tables']['delivery_completions']['Row'];
export type DeliveryCompletionInsert = Database['public']['Tables']['delivery_completions']['Insert'];
export type DeliveryCompletionUpdate = Database['public']['Tables']['delivery_completions']['Update'];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      broadcasts: {
        Row: {
          created_at: string
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      delivery_areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          access_code: string
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          access_code: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_zone_mapping: {
        Row: {
          id: string
          driver_id: string
          zone_id: string
          assigned_at: string
          assigned_by: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          zone_id: string
          assigned_at?: string
          assigned_by?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          zone_id?: string
          assigned_at?: string
          assigned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_zone_mapping_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_zone_mapping_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          company_address: string | null
          company_logo_url: string | null
          created_at: string
          id: string
          invoice_prefix: string
          next_invoice_number: number
          owner_id: string
          tax_name: string | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_logo_url?: string | null
          created_at?: string
          id?: string
          invoice_prefix?: string
          next_invoice_number?: number
          owner_id: string
          tax_name?: string | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_logo_url?: string | null
          created_at?: string
          id?: string
          invoice_prefix?: string
          next_invoice_number?: number
          owner_id?: string
          tax_name?: string | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string
          file_size_bytes: number | null
          id: string
          owner_id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description: string
          file_size_bytes?: number | null
          id?: string
          owner_id: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string
          file_size_bytes?: number | null
          id?: string
          owner_id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_name: string
          owner_id: string
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          owner_id: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          owner_id?: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_consumption: {
        Row: {
          created_at: string
          date: string
          id: string
          inventory_id: string
          notes: string | null
          owner_id: string
          quantity_used: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          inventory_id: string
          notes?: string | null
          owner_id: string
          quantity_used: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          owner_id?: string
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_consumption_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          balance: number
          created_at: string
          id: string
          joining_date: string
          monthly_fee: number
          name: string
          owner_id: string
          phone: string
          plan_expiry_date: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          selected_menu_week: number | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          joining_date?: string
          monthly_fee?: number
          name: string
          owner_id: string
          phone: string
          plan_expiry_date?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          selected_menu_week?: number | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          joining_date?: string
          monthly_fee?: number
          name?: string
          owner_id?: string
          phone?: string
          plan_expiry_date?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          selected_menu_week?: number | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: []
      }
      menu: {
        Row: {
          breakfast: string | null
          created_at: string
          day: string
          dinner: string | null
          id: string
          lunch: string | null
          optional_dishes: Json | null
          owner_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          breakfast?: string | null
          created_at?: string
          day: string
          dinner?: string | null
          id?: string
          lunch?: string | null
          optional_dishes?: Json | null
          owner_id: string
          updated_at?: string
          week_number?: number
        }
        Update: {
          breakfast?: string | null
          created_at?: string
          day?: string
          dinner?: string | null
          id?: string
          lunch?: string | null
          optional_dishes?: Json | null
          owner_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          owner_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          owner_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          owner_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      petty_cash_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          date: string
          description: string
          id: string
          linked_expense_id: string | null
          owner_id: string
          type: Database["public"]["Enums"]["petty_cash_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          date?: string
          description: string
          id?: string
          linked_expense_id?: string | null
          owner_id: string
          type: Database["public"]["Enums"]["petty_cash_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          date?: string
          description?: string
          id?: string
          linked_expense_id?: string | null
          owner_id?: string
          type?: Database["public"]["Enums"]["petty_cash_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_transactions_linked_expense_id_fkey"
            columns: ["linked_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string
          business_slug: string | null
          company_address: string | null
          company_logo_url: string | null
          created_at: string
          currency: string
          id: string
          invoice_count: number
          is_active: boolean
          is_paid: boolean
          last_broadcast_seen_id: string | null
          next_invoice_number: number
          owner_email: string
          payment_link: string | null
          plan_type: string
          storage_limit: number
          storage_used: number
          subscription_expiry: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          tax_name: string | null
          tax_rate: number | null
          tax_trn: string | null
          updated_at: string
          user_id: string
          whatsapp_api_key: string | null
        }
        Insert: {
          business_name: string
          business_slug?: string | null
          company_address?: string | null
          company_logo_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_count?: number
          is_active?: boolean
          is_paid?: boolean
          last_broadcast_seen_id?: string | null
          next_invoice_number?: number
          owner_email: string
          payment_link?: string | null
          plan_type?: string
          storage_limit?: number
          storage_used?: number
          subscription_expiry?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          tax_name?: string | null
          tax_rate?: number | null
          tax_trn?: string | null
          updated_at?: string
          user_id: string
          whatsapp_api_key?: string | null
        }
        Update: {
          business_name?: string
          business_slug?: string | null
          company_address?: string | null
          company_logo_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_count?: number
          is_active?: boolean
          is_paid?: boolean
          last_broadcast_seen_id?: string | null
          next_invoice_number?: number
          owner_email?: string
          payment_link?: string | null
          plan_type?: string
          storage_limit?: number
          storage_used?: number
          subscription_expiry?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          tax_name?: string | null
          tax_rate?: number | null
          tax_trn?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_api_key?: string | null
        }
        Relationships: []
      }
      sales_persons: {
        Row: {
          access_token: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_persons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          created_at: string
          id: string
          member_id: string
          notes: string | null
          owner_id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          sales_person_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          owner_id: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sales_person_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          owner_id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sales_person_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_sales_person_id_fkey"
            columns: ["sales_person_id"]
            isOneToOne: false
            referencedRelation: "sales_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_completions: {
        Row: {
          completed_at: string
          created_at: string
          delivery_date: string
          driver_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_match_distance_km: number | null
          location_match_threshold_km: number
          location_matched: boolean
          member_id: string
          notes: string | null
          owner_id: string
          proof_photo_size: number | null
          proof_photo_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          delivery_date?: string
          driver_id: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_match_distance_km?: number | null
          location_match_threshold_km?: number
          location_matched?: boolean
          member_id: string
          notes?: string | null
          owner_id: string
          proof_photo_size?: number | null
          proof_photo_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          delivery_date?: string
          driver_id?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_match_distance_km?: number | null
          location_match_threshold_km?: number
          location_matched?: boolean
          member_id?: string
          notes?: string | null
          owner_id?: string
          proof_photo_size?: number | null
          proof_photo_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_completions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_assignments: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          promo_code_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          promo_code_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          promo_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_assignments_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          days_to_add: number
          id: string
          is_used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          days_to_add?: number
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          days_to_add?: number
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          notes: string | null
          owner_id: string
          staff_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          owner_id: string
          staff_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          expense_id: string | null
          id: string
          month_year: string
          owner_id: string
          paid_at: string
          staff_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expense_id?: string | null
          id?: string
          month_year: string
          owner_id: string
          paid_at?: string
          staff_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_id?: string | null
          id?: string
          month_year?: string
          owner_id?: string
          paid_at?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          account_number: string | null
          bank_name: string | null
          base_salary: number
          created_at: string
          designation: string | null
          iban: string | null
          id: string
          is_active: boolean
          joining_date: string
          name: string
          owner_id: string
          phone: string
          role: Database["public"]["Enums"]["staff_role"]
          salary_day: number
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          base_salary?: number
          created_at?: string
          designation?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string
          name: string
          owner_id: string
          phone: string
          role?: Database["public"]["Enums"]["staff_role"]
          salary_day?: number
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          base_salary?: number
          created_at?: string
          designation?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string
          name?: string
          owner_id?: string
          phone?: string
          role?: Database["public"]["Enums"]["staff_role"]
          salary_day?: number
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          owner_id: string
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          owner_id: string
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          owner_id?: string
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          member_id: string
          notes: string | null
          owner_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          member_id: string
          notes?: string | null
          owner_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          member_id?: string
          notes?: string | null
          owner_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "mess_owner"
      attendance_status: "present" | "absent" | "half_day"
      expense_category:
      | "groceries"
      | "utilities"
      | "rent"
      | "salaries"
      | "maintenance"
      | "other"
      member_status: "active" | "inactive"
      petty_cash_type: "deposit" | "withdrawal"
      plan_type: "1-time" | "2-time" | "3-time"
      staff_role:
      | "cook"
      | "cleaner"
      | "helper"
      | "manager"
      | "delivery"
      | "other"
      subscription_status: "active" | "expired" | "trial"
      transaction_type: "payment" | "charge" | "adjustment"
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
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DefaultSchema["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DefaultSchema["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
      app_role: ["super_admin", "mess_owner"],
      attendance_status: ["present", "absent", "half_day"],
      expense_category: [
        "groceries",
        "utilities",
        "rent",
        "salaries",
        "maintenance",
        "other",
      ],
      member_status: ["active", "inactive"],
      petty_cash_type: ["refill", "expense"],
      plan_type: ["1-time", "2-time", "3-time"],
      staff_role: ["cook", "cleaner", "helper", "manager", "delivery", "other"],
      subscription_status: ["active", "expired", "trial"],
      transaction_type: ["payment", "charge", "adjustment"],
    },
  },
} as const