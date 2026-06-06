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
      asset_photos: {
        Row: {
          captured_at: string
          captured_by: string | null
          id: string
          image_url: string
          linked_record_id: string | null
          linked_record_type: string | null
          photo_category: string | null
          transformer_id: string | null
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          id?: string
          image_url: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          photo_category?: string | null
          transformer_id?: string | null
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          id?: string
          image_url?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          photo_category?: string | null
          transformer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_photos_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          event_summary: string
          event_type: string
          id: string
          linked_record_id: string | null
          linked_record_type: string | null
          transformer_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_summary: string
          event_type: string
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          transformer_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_summary?: string
          event_type?: string
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          transformer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_timeline_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          created_at: string
          id: string
          name: string
          region: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          region?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      fault_records: {
        Row: {
          area_affected: string | null
          assigned_to: string | null
          created_at: string
          customers_affected: number | null
          date_assigned: string | null
          downtime_hours: number | null
          fault_datetime: string
          fault_description: string | null
          fault_source: string | null
          fault_status: string
          fault_type: string | null
          id: string
          network_voltage_kv: number | null
          parts_replaced: string | null
          reported_by: string | null
          resolution_description: string | null
          resolved_by: string | null
          resolved_date: string | null
          root_cause: string | null
          severity: string | null
          target_resolution: string | null
          transformer_id: string
        }
        Insert: {
          area_affected?: string | null
          assigned_to?: string | null
          created_at?: string
          customers_affected?: number | null
          date_assigned?: string | null
          downtime_hours?: number | null
          fault_datetime: string
          fault_description?: string | null
          fault_source?: string | null
          fault_status?: string
          fault_type?: string | null
          id?: string
          network_voltage_kv?: number | null
          parts_replaced?: string | null
          reported_by?: string | null
          resolution_description?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          root_cause?: string | null
          severity?: string | null
          target_resolution?: string | null
          transformer_id: string
        }
        Update: {
          area_affected?: string | null
          assigned_to?: string | null
          created_at?: string
          customers_affected?: number | null
          date_assigned?: string | null
          downtime_hours?: number | null
          fault_datetime?: string
          fault_description?: string | null
          fault_source?: string | null
          fault_status?: string
          fault_type?: string | null
          id?: string
          network_voltage_kv?: number | null
          parts_replaced?: string | null
          reported_by?: string | null
          resolution_description?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          root_cause?: string | null
          severity?: string | null
          target_resolution?: string | null
          transformer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_records_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      feeders: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          network_voltage_kv: number
          service_area_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          network_voltage_kv: number
          service_area_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          network_voltage_kv?: number
          service_area_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeders_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          error_count: number | null
          error_details: Json | null
          file_name: string | null
          id: string
          imported_by: string | null
          skip_count: number | null
          success_count: number | null
          total_rows: number | null
        }
        Insert: {
          created_at?: string
          error_count?: number | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          imported_by?: string | null
          skip_count?: number | null
          success_count?: number | null
          total_rows?: number | null
        }
        Update: {
          created_at?: string
          error_count?: number | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          imported_by?: string | null
          skip_count?: number | null
          success_count?: number | null
          total_rows?: number | null
        }
        Relationships: []
      }
      inspections: {
        Row: {
          bushing_condition: string | null
          condition_narrative: string | null
          cooling_fins_condition: string | null
          created_at: string
          earthing: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          inspection_date: string
          inspector_id: string | null
          kva_rating_confirmed: boolean | null
          load_percentage: number | null
          load_phase_a: number | null
          load_phase_b: number | null
          load_phase_c: number | null
          network_voltage_confirmed: boolean | null
          oil_leakage: string | null
          oil_level: string | null
          oil_test_required: boolean | null
          overload_flag: boolean | null
          rating_discrepancy_flag: boolean | null
          recommended_action: string | null
          rust_condition: string | null
          security_fencing: string | null
          silica_gel_color: string | null
          tank_damage: string | null
          transformer_id: string
          unauthorized_connections: boolean | null
          vegetation_encroachment: string | null
          visit_type: string | null
          voltage_hv: number | null
          voltage_lv: number | null
          warning_signs: string | null
        }
        Insert: {
          bushing_condition?: string | null
          condition_narrative?: string | null
          cooling_fins_condition?: string | null
          created_at?: string
          earthing?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          inspection_date: string
          inspector_id?: string | null
          kva_rating_confirmed?: boolean | null
          load_percentage?: number | null
          load_phase_a?: number | null
          load_phase_b?: number | null
          load_phase_c?: number | null
          network_voltage_confirmed?: boolean | null
          oil_leakage?: string | null
          oil_level?: string | null
          oil_test_required?: boolean | null
          overload_flag?: boolean | null
          rating_discrepancy_flag?: boolean | null
          recommended_action?: string | null
          rust_condition?: string | null
          security_fencing?: string | null
          silica_gel_color?: string | null
          tank_damage?: string | null
          transformer_id: string
          unauthorized_connections?: boolean | null
          vegetation_encroachment?: string | null
          visit_type?: string | null
          voltage_hv?: number | null
          voltage_lv?: number | null
          warning_signs?: string | null
        }
        Update: {
          bushing_condition?: string | null
          condition_narrative?: string | null
          cooling_fins_condition?: string | null
          created_at?: string
          earthing?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          kva_rating_confirmed?: boolean | null
          load_percentage?: number | null
          load_phase_a?: number | null
          load_phase_b?: number | null
          load_phase_c?: number | null
          network_voltage_confirmed?: boolean | null
          oil_leakage?: string | null
          oil_level?: string | null
          oil_test_required?: boolean | null
          overload_flag?: boolean | null
          rating_discrepancy_flag?: boolean | null
          recommended_action?: string | null
          rust_condition?: string | null
          security_fencing?: string | null
          silica_gel_color?: string | null
          tank_damage?: string | null
          transformer_id?: string
          unauthorized_connections?: boolean | null
          vegetation_encroachment?: string | null
          visit_type?: string | null
          voltage_hv?: number | null
          voltage_lv?: number | null
          warning_signs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_records: {
        Row: {
          commissioned_by: string | null
          commissioning_readings: string | null
          created_at: string
          handover_date: string | null
          id: string
          installation_date: string
          installation_type: string | null
          installing_team: string | null
          kva_rating: number | null
          network_voltage_kv: number | null
          pre_install_test_results: string | null
          previous_transformer_id: string | null
          replacement_reason: string | null
          supervised_by: string | null
          transformer_id: string
          transformer_source: string | null
        }
        Insert: {
          commissioned_by?: string | null
          commissioning_readings?: string | null
          created_at?: string
          handover_date?: string | null
          id?: string
          installation_date: string
          installation_type?: string | null
          installing_team?: string | null
          kva_rating?: number | null
          network_voltage_kv?: number | null
          pre_install_test_results?: string | null
          previous_transformer_id?: string | null
          replacement_reason?: string | null
          supervised_by?: string | null
          transformer_id: string
          transformer_source?: string | null
        }
        Update: {
          commissioned_by?: string | null
          commissioning_readings?: string | null
          created_at?: string
          handover_date?: string | null
          id?: string
          installation_date?: string
          installation_type?: string | null
          installing_team?: string | null
          kva_rating?: number | null
          network_voltage_kv?: number | null
          pre_install_test_results?: string | null
          previous_transformer_id?: string | null
          replacement_reason?: string | null
          supervised_by?: string | null
          transformer_id?: string
          transformer_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_records_previous_transformer_id_fkey"
            columns: ["previous_transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_records_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          bushing_replacement: boolean | null
          completed_by: string | null
          cooling_service: boolean | null
          created_at: string
          id: string
          load_after_a: number | null
          load_after_b: number | null
          load_after_c: number | null
          maintenance_date: string
          maintenance_type: string | null
          next_maintenance_date: string | null
          oil_filtration: boolean | null
          oil_replacement: boolean | null
          oil_topup: boolean | null
          oil_topup_liters: number | null
          other_work: string | null
          parts_used: string | null
          physical_cleaning: boolean | null
          post_condition_narrative: string | null
          reviewed_by: string | null
          silica_gel_replaced: boolean | null
          supervised_by: string | null
          tap_changer_service: boolean | null
          team_contractor: string | null
          technician_id: string | null
          transformer_id: string
        }
        Insert: {
          bushing_replacement?: boolean | null
          completed_by?: string | null
          cooling_service?: boolean | null
          created_at?: string
          id?: string
          load_after_a?: number | null
          load_after_b?: number | null
          load_after_c?: number | null
          maintenance_date: string
          maintenance_type?: string | null
          next_maintenance_date?: string | null
          oil_filtration?: boolean | null
          oil_replacement?: boolean | null
          oil_topup?: boolean | null
          oil_topup_liters?: number | null
          other_work?: string | null
          parts_used?: string | null
          physical_cleaning?: boolean | null
          post_condition_narrative?: string | null
          reviewed_by?: string | null
          silica_gel_replaced?: boolean | null
          supervised_by?: string | null
          tap_changer_service?: boolean | null
          team_contractor?: string | null
          technician_id?: string | null
          transformer_id: string
        }
        Update: {
          bushing_replacement?: boolean | null
          completed_by?: string | null
          cooling_service?: boolean | null
          created_at?: string
          id?: string
          load_after_a?: number | null
          load_after_b?: number | null
          load_after_c?: number | null
          maintenance_date?: string
          maintenance_type?: string | null
          next_maintenance_date?: string | null
          oil_filtration?: boolean | null
          oil_replacement?: boolean | null
          oil_topup?: boolean | null
          oil_topup_liters?: number | null
          other_work?: string | null
          parts_used?: string | null
          physical_cleaning?: boolean | null
          post_condition_narrative?: string | null
          reviewed_by?: string | null
          silica_gel_replaced?: boolean | null
          supervised_by?: string | null
          tap_changer_service?: boolean | null
          team_contractor?: string | null
          technician_id?: string | null
          transformer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          linked_record_id: string | null
          linked_record_type: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          linked_record_id?: string | null
          linked_record_type?: string | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          linked_record_id?: string | null
          linked_record_type?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          service_area_id: string | null
          territory_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          service_area_id?: string | null
          territory_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          service_area_id?: string | null
          territory_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          generated_at: string
          generated_by: string | null
          id: string
          last_scanned_at: string | null
          qr_code_string: string
          status: string
          transformer_id: string
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          last_scanned_at?: string | null
          qr_code_string: string
          status?: string
          transformer_id: string
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          last_scanned_at?: string | null
          qr_code_string?: string
          status?: string
          transformer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_transformer_id_fkey"
            columns: ["transformer_id"]
            isOneToOne: false
            referencedRelation: "transformers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          created_at: string
          id: string
          location_town: string | null
          name: string
          territory_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_town?: string | null
          name: string
          territory_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_town?: string | null
          name?: string
          territory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "service_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_territories: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      transformer_ratings: {
        Row: {
          display_label: string
          id: string
          kva: number
          network_voltage_kv: number
        }
        Insert: {
          display_label: string
          id?: string
          kva: number
          network_voltage_kv: number
        }
        Update: {
          display_label?: string
          id?: string
          kva?: number
          network_voltage_kv?: number
        }
        Relationships: []
      }
      transformers: {
        Row: {
          asset_id: string | null
          batch_import_id: string | null
          commissioned_by: string | null
          commissioning_date: string | null
          cooling_type: string | null
          created_at: string
          created_by: string | null
          district_id: string | null
          feeder_id: string | null
          gps_accuracy: number | null
          gps_method: string | null
          has_open_fault: boolean | null
          id: string
          install_date: string | null
          installing_contractor: string | null
          kva_rating: number | null
          last_inspection_date: string | null
          last_load_reading_date: string | null
          last_maintenance_date: string | null
          latitude: number | null
          longitude: number | null
          manufacturer: string | null
          mounting_type: string | null
          network_voltage_kv: number | null
          operational_status: string | null
          parish: string | null
          phase_type: string | null
          rating_id: string | null
          record_status: string | null
          serial_number: string | null
          service_area_id: string | null
          site_name: string | null
          sub_county: string | null
          substation_name: string | null
          territory_id: string | null
          uedcl_reference: string | null
          updated_at: string
          updated_by: string | null
          vector_group: string | null
          village: string | null
          voltage_secondary: string | null
          warranty_expiry: string | null
          year_manufactured: number | null
        }
        Insert: {
          asset_id?: string | null
          batch_import_id?: string | null
          commissioned_by?: string | null
          commissioning_date?: string | null
          cooling_type?: string | null
          created_at?: string
          created_by?: string | null
          district_id?: string | null
          feeder_id?: string | null
          gps_accuracy?: number | null
          gps_method?: string | null
          has_open_fault?: boolean | null
          id?: string
          install_date?: string | null
          installing_contractor?: string | null
          kva_rating?: number | null
          last_inspection_date?: string | null
          last_load_reading_date?: string | null
          last_maintenance_date?: string | null
          latitude?: number | null
          longitude?: number | null
          manufacturer?: string | null
          mounting_type?: string | null
          network_voltage_kv?: number | null
          operational_status?: string | null
          parish?: string | null
          phase_type?: string | null
          rating_id?: string | null
          record_status?: string | null
          serial_number?: string | null
          service_area_id?: string | null
          site_name?: string | null
          sub_county?: string | null
          substation_name?: string | null
          territory_id?: string | null
          uedcl_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          vector_group?: string | null
          village?: string | null
          voltage_secondary?: string | null
          warranty_expiry?: string | null
          year_manufactured?: number | null
        }
        Update: {
          asset_id?: string | null
          batch_import_id?: string | null
          commissioned_by?: string | null
          commissioning_date?: string | null
          cooling_type?: string | null
          created_at?: string
          created_by?: string | null
          district_id?: string | null
          feeder_id?: string | null
          gps_accuracy?: number | null
          gps_method?: string | null
          has_open_fault?: boolean | null
          id?: string
          install_date?: string | null
          installing_contractor?: string | null
          kva_rating?: number | null
          last_inspection_date?: string | null
          last_load_reading_date?: string | null
          last_maintenance_date?: string | null
          latitude?: number | null
          longitude?: number | null
          manufacturer?: string | null
          mounting_type?: string | null
          network_voltage_kv?: number | null
          operational_status?: string | null
          parish?: string | null
          phase_type?: string | null
          rating_id?: string | null
          record_status?: string | null
          serial_number?: string | null
          service_area_id?: string | null
          site_name?: string | null
          sub_county?: string | null
          substation_name?: string | null
          territory_id?: string | null
          uedcl_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          vector_group?: string | null
          village?: string | null
          voltage_secondary?: string | null
          warranty_expiry?: string | null
          year_manufactured?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transformers_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformers_feeder_id_fkey"
            columns: ["feeder_id"]
            isOneToOne: false
            referencedRelation: "feeders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformers_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "transformer_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformers_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformers_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "service_territories"
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
      can_edit_assets: { Args: { _user_id: string }; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "territory_manager"
        | "engineer"
        | "field_technician"
        | "viewer"
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
      app_role: [
        "super_admin",
        "territory_manager",
        "engineer",
        "field_technician",
        "viewer",
      ],
    },
  },
} as const
