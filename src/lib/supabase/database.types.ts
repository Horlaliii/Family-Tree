
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"change_group": string | null,"created_at": string,"id": number,"record_id": string | null,"table_name": string
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"change_group"?: string | null,"created_at"?: string,"id"?: never,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"change_group"?: string | null,"created_at"?: string,"id"?: never,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"citations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"detail": string | null,"fact_id": string | null,"id": string,"name_id": string | null,"parent_child_id": string | null,"person_field": Database["public"]['Enums']["citation_person_field"] | null,"person_id": string | null,"source_id": string,"union_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"detail"?: string | null,"fact_id"?: string | null,"id"?: string,"name_id"?: string | null,"parent_child_id"?: string | null,"person_field"?: Database["public"]['Enums']["citation_person_field"] | null,"person_id"?: string | null,"source_id": string,"union_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"detail"?: string | null,"fact_id"?: string | null,"id"?: string,"name_id"?: string | null,"parent_child_id"?: string | null,"person_field"?: Database["public"]['Enums']["citation_person_field"] | null,"person_id"?: string | null,"source_id"?: string,"union_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "citations_fact_id_fkey"
      columns: ["fact_id"]
isOneToOne: false
      referencedRelation: "facts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_fact_id_fkey"
      columns: ["fact_id"]
isOneToOne: false
      referencedRelation: "v_facts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_name_id_fkey"
      columns: ["name_id"]
isOneToOne: false
      referencedRelation: "person_names"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_name_id_fkey"
      columns: ["name_id"]
isOneToOne: false
      referencedRelation: "v_person_names"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_parent_child_id_fkey"
      columns: ["parent_child_id"]
isOneToOne: false
      referencedRelation: "parent_child"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_parent_child_id_fkey"
      columns: ["parent_child_id"]
isOneToOne: false
      referencedRelation: "v_parent_child"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "v_sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_union_id_fkey"
      columns: ["union_id"]
isOneToOne: false
      referencedRelation: "unions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_union_id_fkey"
      columns: ["union_id"]
isOneToOne: false
      referencedRelation: "v_unions"
      referencedColumns: ["id"]
    }
                  ]
                },"facts": {
                  Row: {
                    "confidence": Database["public"]['Enums']["confidence_level"],"created_at": string,"created_by": string | null,"custom_label": string | null,"deleted_at": string | null,"description": string | null,"fact_date": string | null,"fact_date_end": string | null,"fact_precision": Database["public"]['Enums']["date_precision"] | null,"fact_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"fact_text": string | null,"fact_type": Database["public"]['Enums']["fact_type"],"id": string,"person_id": string,"place_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "confidence"?: Database["public"]['Enums']["confidence_level"],"created_at"?: string,"created_by"?: string | null,"custom_label"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"fact_date"?: string | null,"fact_date_end"?: string | null,"fact_precision"?: Database["public"]['Enums']["date_precision"] | null,"fact_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"fact_text"?: string | null,"fact_type": Database["public"]['Enums']["fact_type"],"id"?: string,"person_id": string,"place_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "confidence"?: Database["public"]['Enums']["confidence_level"],"created_at"?: string,"created_by"?: string | null,"custom_label"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"fact_date"?: string | null,"fact_date_end"?: string | null,"fact_precision"?: Database["public"]['Enums']["date_precision"] | null,"fact_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"fact_text"?: string | null,"fact_type"?: Database["public"]['Enums']["fact_type"],"id"?: string,"person_id"?: string,"place_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "facts_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facts_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facts_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facts_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "v_places"
      referencedColumns: ["id"]
    }
                  ]
                },"media": {
                  Row: {
                    "bytes": number | null,"caption": string | null,"created_at": string,"deleted_at": string | null,"height": number | null,"id": string,"media_date": string | null,"media_date_end": string | null,"media_precision": Database["public"]['Enums']["date_precision"] | null,"media_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"media_text": string | null,"media_type": Database["public"]['Enums']["media_type"],"mime_type": string,"original_filename": string | null,"storage_path": string,"thumbnail_path": string | null,"updated_at": string,"uploaded_by": string | null,"width": number | null
                  }
                  Insert: {
                    "bytes"?: number | null,"caption"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"height"?: number | null,"id"?: string,"media_date"?: string | null,"media_date_end"?: string | null,"media_precision"?: Database["public"]['Enums']["date_precision"] | null,"media_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"media_text"?: string | null,"media_type": Database["public"]['Enums']["media_type"],"mime_type": string,"original_filename"?: string | null,"storage_path": string,"thumbnail_path"?: string | null,"updated_at"?: string,"uploaded_by"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "bytes"?: number | null,"caption"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"height"?: number | null,"id"?: string,"media_date"?: string | null,"media_date_end"?: string | null,"media_precision"?: Database["public"]['Enums']["date_precision"] | null,"media_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"media_text"?: string | null,"media_type"?: Database["public"]['Enums']["media_type"],"mime_type"?: string,"original_filename"?: string | null,"storage_path"?: string,"thumbnail_path"?: string | null,"updated_at"?: string,"uploaded_by"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"media_people": {
                  Row: {
                    "created_at": string,"media_id": string,"person_id": string
                  }
                  Insert: {
                    "created_at"?: string,"media_id": string,"person_id": string
                  }
                  Update: {
                    "created_at"?: string,"media_id"?: string,"person_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_people_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_people_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "v_media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_people_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_people_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"parent_child": {
                  Row: {
                    "child_id": string,"confidence": Database["public"]['Enums']["confidence_level"],"created_at": string,"created_by": string | null,"id": string,"parent_id": string,"relationship_type": Database["public"]['Enums']["parent_relationship"],"updated_at": string
                  }
                  Insert: {
                    "child_id": string,"confidence"?: Database["public"]['Enums']["confidence_level"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"parent_id": string,"relationship_type"?: Database["public"]['Enums']["parent_relationship"],"updated_at"?: string
                  }
                  Update: {
                    "child_id"?: string,"confidence"?: Database["public"]['Enums']["confidence_level"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"parent_id"?: string,"relationship_type"?: Database["public"]['Enums']["parent_relationship"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parent_child_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_child_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_child_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_child_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"person_names": {
                  Row: {
                    "created_at": string,"given_names": string | null,"id": string,"is_primary": boolean,"name_type": Database["public"]['Enums']["name_type"],"person_id": string,"search_text": string | null,"search_tsv": unknown,"sort_order": number,"surname": string | null,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"given_names"?: string | null,"id"?: string,"is_primary"?: boolean,"name_type"?: Database["public"]['Enums']["name_type"],"person_id": string,"search_text"?: never,"search_tsv"?: never,"sort_order"?: number,"surname"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"given_names"?: string | null,"id"?: string,"is_primary"?: boolean,"name_type"?: Database["public"]['Enums']["name_type"],"person_id"?: string,"search_text"?: never,"search_tsv"?: never,"sort_order"?: number,"surname"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "person_names_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "person_names_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"persons": {
                  Row: {
                    "bio": string | null,"birth_confidence": Database["public"]['Enums']["confidence_level"] | null,"birth_date": string | null,"birth_date_end": string | null,"birth_place_id": string | null,"birth_precision": Database["public"]['Enums']["date_precision"] | null,"birth_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"birth_text": string | null,"birth_year": number | null,"clan": string | null,"created_at": string,"created_by": string | null,"death_confidence": Database["public"]['Enums']["confidence_level"] | null,"death_date": string | null,"death_date_end": string | null,"death_place_id": string | null,"death_precision": Database["public"]['Enums']["date_precision"] | null,"death_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"death_text": string | null,"death_year": number | null,"deleted_at": string | null,"display_name": string,"hometown_place_id": string | null,"id": string,"is_living_override": boolean | null,"occupation": string | null,"profile_photo_id": string | null,"sex": Database["public"]['Enums']["sex_type"],"slug": string,"totem": string | null,"updated_at": string,"can_view_person_details": boolean | null,"person_is_living": boolean | null
                  }
                  Insert: {
                    "bio"?: string | null,"birth_confidence"?: Database["public"]['Enums']["confidence_level"] | null,"birth_date"?: string | null,"birth_date_end"?: string | null,"birth_place_id"?: string | null,"birth_precision"?: Database["public"]['Enums']["date_precision"] | null,"birth_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"birth_text"?: string | null,"birth_year"?: never,"clan"?: string | null,"created_at"?: string,"created_by"?: string | null,"death_confidence"?: Database["public"]['Enums']["confidence_level"] | null,"death_date"?: string | null,"death_date_end"?: string | null,"death_place_id"?: string | null,"death_precision"?: Database["public"]['Enums']["date_precision"] | null,"death_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"death_text"?: string | null,"death_year"?: never,"deleted_at"?: string | null,"display_name"?: string,"hometown_place_id"?: string | null,"id"?: string,"is_living_override"?: boolean | null,"occupation"?: string | null,"profile_photo_id"?: string | null,"sex"?: Database["public"]['Enums']["sex_type"],"slug": string,"totem"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bio"?: string | null,"birth_confidence"?: Database["public"]['Enums']["confidence_level"] | null,"birth_date"?: string | null,"birth_date_end"?: string | null,"birth_place_id"?: string | null,"birth_precision"?: Database["public"]['Enums']["date_precision"] | null,"birth_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"birth_text"?: string | null,"birth_year"?: never,"clan"?: string | null,"created_at"?: string,"created_by"?: string | null,"death_confidence"?: Database["public"]['Enums']["confidence_level"] | null,"death_date"?: string | null,"death_date_end"?: string | null,"death_place_id"?: string | null,"death_precision"?: Database["public"]['Enums']["date_precision"] | null,"death_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"death_text"?: string | null,"death_year"?: never,"deleted_at"?: string | null,"display_name"?: string,"hometown_place_id"?: string | null,"id"?: string,"is_living_override"?: boolean | null,"occupation"?: string | null,"profile_photo_id"?: string | null,"sex"?: Database["public"]['Enums']["sex_type"],"slug"?: string,"totem"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "persons_birth_place_id_fkey"
      columns: ["birth_place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_birth_place_id_fkey"
      columns: ["birth_place_id"]
isOneToOne: false
      referencedRelation: "v_places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_death_place_id_fkey"
      columns: ["death_place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_death_place_id_fkey"
      columns: ["death_place_id"]
isOneToOne: false
      referencedRelation: "v_places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_hometown_place_id_fkey"
      columns: ["hometown_place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_hometown_place_id_fkey"
      columns: ["hometown_place_id"]
isOneToOne: false
      referencedRelation: "v_places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_profile_photo_fk"
      columns: ["profile_photo_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_profile_photo_fk"
      columns: ["profile_photo_id"]
isOneToOne: false
      referencedRelation: "v_media"
      referencedColumns: ["id"]
    }
                  ]
                },"places": {
                  Row: {
                    "country": string | null,"created_at": string,"created_by": string | null,"id": string,"lat": number | null,"lng": number | null,"name": string,"region": string | null,"search_text": string | null,"town": string | null,"updated_at": string
                  }
                  Insert: {
                    "country"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"name": string,"region"?: string | null,"search_text"?: never,"town"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "country"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"name"?: string,"region"?: string | null,"search_text"?: never,"town"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  Insert: {
                    "count"?: number,"key": string,"window_start"?: string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_secrets": {
                  Row: {
                    "id": boolean,"passcode_enabled": boolean,"passcode_hash": string | null,"passcode_version": number,"updated_at": string
                  }
                  Insert: {
                    "id"?: boolean,"passcode_enabled"?: boolean,"passcode_hash"?: string | null,"passcode_version"?: number,"updated_at"?: string
                  }
                  Update: {
                    "id"?: boolean,"passcode_enabled"?: boolean,"passcode_hash"?: string | null,"passcode_version"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "featured_person_id": string | null,"id": boolean,"intro_md": string | null,"site_name": string,"updated_at": string
                  }
                  Insert: {
                    "featured_person_id"?: string | null,"id"?: boolean,"intro_md"?: string | null,"site_name"?: string,"updated_at"?: string
                  }
                  Update: {
                    "featured_person_id"?: string | null,"id"?: boolean,"intro_md"?: string | null,"site_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_featured_person_id_fkey"
      columns: ["featured_person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "site_settings_featured_person_id_fkey"
      columns: ["featured_person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"informant": string | null,"media_id": string | null,"notes": string | null,"recorded_on": string | null,"source_type": Database["public"]['Enums']["source_type"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"informant"?: string | null,"media_id"?: string | null,"notes"?: string | null,"recorded_on"?: string | null,"source_type"?: Database["public"]['Enums']["source_type"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"informant"?: string | null,"media_id"?: string | null,"notes"?: string | null,"recorded_on"?: string | null,"source_type"?: Database["public"]['Enums']["source_type"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sources_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sources_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "v_media"
      referencedColumns: ["id"]
    }
                  ]
                },"unions": {
                  Row: {
                    "confidence": Database["public"]['Enums']["confidence_level"],"created_at": string,"created_by": string | null,"end_date": string | null,"end_date_end": string | null,"end_precision": Database["public"]['Enums']["date_precision"] | null,"end_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"end_reason": Database["public"]['Enums']["union_end_reason"] | null,"end_text": string | null,"id": string,"notes": string | null,"partner_a_id": string,"partner_a_order": number,"partner_b_id": string,"partner_b_order": number,"start_date": string | null,"start_date_end": string | null,"start_precision": Database["public"]['Enums']["date_precision"] | null,"start_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"start_text": string | null,"union_type": Database["public"]['Enums']["union_type"],"updated_at": string
                  }
                  Insert: {
                    "confidence"?: Database["public"]['Enums']["confidence_level"],"created_at"?: string,"created_by"?: string | null,"end_date"?: string | null,"end_date_end"?: string | null,"end_precision"?: Database["public"]['Enums']["date_precision"] | null,"end_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"end_reason"?: Database["public"]['Enums']["union_end_reason"] | null,"end_text"?: string | null,"id"?: string,"notes"?: string | null,"partner_a_id": string,"partner_a_order"?: number,"partner_b_id": string,"partner_b_order"?: number,"start_date"?: string | null,"start_date_end"?: string | null,"start_precision"?: Database["public"]['Enums']["date_precision"] | null,"start_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"start_text"?: string | null,"union_type"?: Database["public"]['Enums']["union_type"],"updated_at"?: string
                  }
                  Update: {
                    "confidence"?: Database["public"]['Enums']["confidence_level"],"created_at"?: string,"created_by"?: string | null,"end_date"?: string | null,"end_date_end"?: string | null,"end_precision"?: Database["public"]['Enums']["date_precision"] | null,"end_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"end_reason"?: Database["public"]['Enums']["union_end_reason"] | null,"end_text"?: string | null,"id"?: string,"notes"?: string | null,"partner_a_id"?: string,"partner_a_order"?: number,"partner_b_id"?: string,"partner_b_order"?: number,"start_date"?: string | null,"start_date_end"?: string | null,"start_precision"?: Database["public"]['Enums']["date_precision"] | null,"start_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"start_text"?: string | null,"union_type"?: Database["public"]['Enums']["union_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unions_partner_a_id_fkey"
      columns: ["partner_a_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unions_partner_a_id_fkey"
      columns: ["partner_a_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unions_partner_b_id_fkey"
      columns: ["partner_b_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unions_partner_b_id_fkey"
      columns: ["partner_b_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"user_profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"email": string | null,"linked_person_id": string | null,"role": Database["public"]['Enums']["user_role"],"status": Database["public"]['Enums']["user_status"],"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"email"?: string | null,"linked_person_id"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["user_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"email"?: string | null,"linked_person_id"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["user_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_profiles_linked_person_id_fkey"
      columns: ["linked_person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_profiles_linked_person_id_fkey"
      columns: ["linked_person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_citations": {
                  Row: {
                    "detail": string | null,"fact_id": string | null,"id": string | null,"name_id": string | null,"parent_child_id": string | null,"person_field": Database["public"]['Enums']["citation_person_field"] | null,"person_id": string | null,"source_id": string | null,"union_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "citations_fact_id_fkey"
      columns: ["fact_id"]
isOneToOne: false
      referencedRelation: "facts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_fact_id_fkey"
      columns: ["fact_id"]
isOneToOne: false
      referencedRelation: "v_facts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_name_id_fkey"
      columns: ["name_id"]
isOneToOne: false
      referencedRelation: "person_names"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_name_id_fkey"
      columns: ["name_id"]
isOneToOne: false
      referencedRelation: "v_person_names"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_parent_child_id_fkey"
      columns: ["parent_child_id"]
isOneToOne: false
      referencedRelation: "parent_child"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_parent_child_id_fkey"
      columns: ["parent_child_id"]
isOneToOne: false
      referencedRelation: "v_parent_child"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "v_sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_union_id_fkey"
      columns: ["union_id"]
isOneToOne: false
      referencedRelation: "unions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citations_union_id_fkey"
      columns: ["union_id"]
isOneToOne: false
      referencedRelation: "v_unions"
      referencedColumns: ["id"]
    }
                  ]
                },"v_facts": {
                  Row: {
                    "confidence": Database["public"]['Enums']["confidence_level"] | null,"created_at": string | null,"custom_label": string | null,"description": string | null,"fact_date": string | null,"fact_date_end": string | null,"fact_precision": Database["public"]['Enums']["date_precision"] | null,"fact_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"fact_text": string | null,"fact_type": Database["public"]['Enums']["fact_type"] | null,"id": string | null,"person_id": string | null,"place_id": string | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "facts_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facts_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facts_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facts_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "v_places"
      referencedColumns: ["id"]
    }
                  ]
                },"v_media": {
                  Row: {
                    "bytes": number | null,"caption": string | null,"created_at": string | null,"height": number | null,"id": string | null,"media_date": string | null,"media_date_end": string | null,"media_precision": Database["public"]['Enums']["date_precision"] | null,"media_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"media_text": string | null,"media_type": Database["public"]['Enums']["media_type"] | null,"mime_type": string | null,"original_filename": string | null,"storage_path": string | null,"thumbnail_path": string | null,"updated_at": string | null,"width": number | null
                  }
                  Insert: {
                           "bytes"?: number | null,"caption"?: string | null,"created_at"?: string | null,"height"?: number | null,"id"?: string | null,"media_date"?: string | null,"media_date_end"?: string | null,"media_precision"?: Database["public"]['Enums']["date_precision"] | null,"media_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"media_text"?: string | null,"media_type"?: Database["public"]['Enums']["media_type"] | null,"mime_type"?: string | null,"original_filename"?: string | null,"storage_path"?: string | null,"thumbnail_path"?: string | null,"updated_at"?: string | null,"width"?: number | null
                         }
                        Update: {
                           "bytes"?: number | null,"caption"?: string | null,"created_at"?: string | null,"height"?: number | null,"id"?: string | null,"media_date"?: string | null,"media_date_end"?: string | null,"media_precision"?: Database["public"]['Enums']["date_precision"] | null,"media_qualifier"?: Database["public"]['Enums']["date_qualifier"] | null,"media_text"?: string | null,"media_type"?: Database["public"]['Enums']["media_type"] | null,"mime_type"?: string | null,"original_filename"?: string | null,"storage_path"?: string | null,"thumbnail_path"?: string | null,"updated_at"?: string | null,"width"?: number | null
                         }
                        Relationships: [
                    
                  ]
                },"v_media_people": {
                  Row: {
                    "media_id": string | null,"person_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_people_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_people_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "v_media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_people_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_people_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"v_parent_child": {
                  Row: {
                    "child_id": string | null,"confidence": Database["public"]['Enums']["confidence_level"] | null,"id": string | null,"parent_id": string | null,"relationship_type": Database["public"]['Enums']["parent_relationship"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "parent_child_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_child_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_child_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_child_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"v_person_names": {
                  Row: {
                    "given_names": string | null,"id": string | null,"is_primary": boolean | null,"name_type": Database["public"]['Enums']["name_type"] | null,"person_id": string | null,"search_text": string | null,"search_tsv": unknown,"sort_order": number | null,"surname": string | null,"title": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "person_names_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "person_names_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                },"v_persons": {
                  Row: {
                    "bio": string | null,"birth_confidence": Database["public"]['Enums']["confidence_level"] | null,"birth_date": string | null,"birth_date_end": string | null,"birth_place_id": string | null,"birth_precision": Database["public"]['Enums']["date_precision"] | null,"birth_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"birth_text": string | null,"birth_year": number | null,"can_view_details": boolean | null,"clan": string | null,"created_at": string | null,"death_confidence": Database["public"]['Enums']["confidence_level"] | null,"death_date": string | null,"death_date_end": string | null,"death_place_id": string | null,"death_precision": Database["public"]['Enums']["date_precision"] | null,"death_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"death_text": string | null,"death_year": number | null,"display_name": string | null,"hometown_place_id": string | null,"id": string | null,"is_living": boolean | null,"is_living_override": boolean | null,"occupation": string | null,"profile_photo_id": string | null,"sex": Database["public"]['Enums']["sex_type"] | null,"slug": string | null,"totem": string | null,"updated_at": string | null,"person_card_json": Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "persons_profile_photo_fk"
      columns: ["profile_photo_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "persons_profile_photo_fk"
      columns: ["profile_photo_id"]
isOneToOne: false
      referencedRelation: "v_media"
      referencedColumns: ["id"]
    }
                  ]
                },"v_places": {
                  Row: {
                    "country": string | null,"id": string | null,"lat": number | null,"lng": number | null,"name": string | null,"region": string | null,"search_text": string | null,"town": string | null
                  }
                  Insert: {
                           "country"?: string | null,"id"?: string | null,"lat"?: number | null,"lng"?: number | null,"name"?: string | null,"region"?: string | null,"search_text"?: string | null,"town"?: string | null
                         }
                        Update: {
                           "country"?: string | null,"id"?: string | null,"lat"?: number | null,"lng"?: number | null,"name"?: string | null,"region"?: string | null,"search_text"?: string | null,"town"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"v_sources": {
                  Row: {
                    "created_at": string | null,"id": string | null,"informant": string | null,"media_id": string | null,"notes": string | null,"recorded_on": string | null,"source_type": Database["public"]['Enums']["source_type"] | null,"title": string | null,"updated_at": string | null
                  }
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"informant"?: string | null,"media_id"?: string | null,"notes"?: string | null,"recorded_on"?: string | null,"source_type"?: Database["public"]['Enums']["source_type"] | null,"title"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"informant"?: string | null,"media_id"?: string | null,"notes"?: string | null,"recorded_on"?: string | null,"source_type"?: Database["public"]['Enums']["source_type"] | null,"title"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "sources_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sources_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "v_media"
      referencedColumns: ["id"]
    }
                  ]
                },"v_unions": {
                  Row: {
                    "can_view_details": boolean | null,"confidence": Database["public"]['Enums']["confidence_level"] | null,"end_date": string | null,"end_date_end": string | null,"end_precision": Database["public"]['Enums']["date_precision"] | null,"end_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"end_reason": Database["public"]['Enums']["union_end_reason"] | null,"end_text": string | null,"id": string | null,"notes": string | null,"partner_a_id": string | null,"partner_a_order": number | null,"partner_b_id": string | null,"partner_b_order": number | null,"start_date": string | null,"start_date_end": string | null,"start_precision": Database["public"]['Enums']["date_precision"] | null,"start_qualifier": Database["public"]['Enums']["date_qualifier"] | null,"start_text": string | null,"union_type": Database["public"]['Enums']["union_type"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "unions_partner_a_id_fkey"
      columns: ["partner_a_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unions_partner_a_id_fkey"
      columns: ["partner_a_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unions_partner_b_id_fkey"
      columns: ["partner_b_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unions_partner_b_id_fkey"
      columns: ["partner_b_id"]
isOneToOne: false
      referencedRelation: "v_persons"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_relative":
{ Args: { "p_anchor": string,"p_existing_id"?: string,"p_names"?: Json,"p_options"?: Json,"p_person"?: Json,"p_relation": string }; Returns: Json
                           },
"begin_change_group":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"can_browse":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_view_person_details":
{ Args: { "p": Database["public"]['Tables']["persons"]['Row'] }; Returns: boolean
                           },
"can_view_person_details_by_id":
{ Args: { "p_id": string }; Returns: boolean
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"find_possible_duplicates":
{ Args: { "p_birth_year"?: number,"p_exclude"?: string,"p_given_names": string,"p_surname": string }; Returns: {
              "card": Json,"id": string,"score": number,"slug": string
            }[]
                           },
"format_fuzzy_date":
{ Args: { "d": string,"d_end": string,"p": Database["public"]['Enums']["date_precision"],"q": Database["public"]['Enums']["date_qualifier"],"t": string }; Returns: string
                           },
"format_person_name":
{ Args: { "given_names": string,"surname": string,"title": string }; Returns: string
                           },
"generate_person_slug":
{ Args: { "p_name": string }; Returns: string
                           },
"get_ancestors":
{ Args: { "p_generations"?: number,"p_person_id": string,"p_types"?: (Database["public"]['Enums']["parent_relationship"])[] }; Returns: {
              "generation": number,"person_id": string
            }[]
                           },
"get_descendants":
{ Args: { "p_generations"?: number,"p_person_id": string,"p_types"?: (Database["public"]['Enums']["parent_relationship"])[] }; Returns: {
              "generation": number,"person_id": string
            }[]
                           },
"get_person_family":
{ Args: { "p_person_id": string }; Returns: Json
                           },
"get_site_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_tree_window":
{ Args: { "p_down"?: number,"p_focus": string,"p_lineage"?: string,"p_up"?: number }; Returns: Json
                           },
"has_full_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_editor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_member":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"latest_possible_year":
{ Args: { "d": string,"d_end": string,"q": Database["public"]['Enums']["date_qualifier"] }; Returns: number
                           },
"normalize_name":
{ Args: { "value": string }; Returns: string
                           },
"person_card_json":
{ Args: { "p": Database["public"]['Views']["v_persons"]['Row'] }; Returns: Json
                           },
"person_is_living":
{ Args: { "p": Database["public"]['Tables']["persons"]['Row'] }; Returns: boolean
                           },
"person_is_living_by_id":
{ Args: { "p_id": string }; Returns: boolean
                           },
"refresh_display_name":
{ Args: { "p_person_id": string }; Returns: undefined
                           },
"relationship_warnings":
{ Args: { "p_person_id": string }; Returns: {
              "code": string,"message": string,"other_person_id": string
            }[]
                           },
"research_gaps":
{ Args: { "p_filter"?: string,"p_limit"?: number,"p_offset"?: number,"p_sort"?: string }; Returns: {
              "card": Json,"gap_count": number,"missing_birth": boolean,"missing_death": boolean,"missing_father": boolean,"missing_mother": boolean,"total_count": number,"unsourced_facts": number,"unsourced_vitals": boolean
            }[]
                           },
"save_person":
{ Args: { "p_id": string,"p_names": Json,"p_person": Json }; Returns: Json
                           },
"search_people":
{ Args: { "max_results"?: number,"q": string,"skip"?: number }; Returns: {
              "card": Json,"display_name": string,"id": string,"matched_name": string,"parent_names": (string)[],"score": number,"slug": string,"total_count": number
            }[]
                           }
          }
          Enums: {
            "citation_person_field": "birth"|"death","confidence_level": "confirmed"|"family_account"|"uncertain","date_precision": "year"|"month"|"day","date_qualifier": "exact"|"about"|"before"|"after"|"between","fact_type": "baptism"|"education"|"migration"|"burial"|"occupation"|"custom","media_type": "photo"|"document","name_type": "birth"|"day"|"baptismal"|"married"|"nickname"|"other","parent_relationship": "biological"|"adoptive"|"step"|"foster"|"guardian","sex_type": "male"|"female"|"unknown","source_type": "certificate"|"church_record"|"oral_account"|"letter"|"photo"|"other","union_end_reason": "divorce"|"death"|"other","union_type": "customary"|"church"|"civil"|"partnership"|"unknown","user_role": "member"|"editor"|"admin","user_status": "active"|"pending"|"disabled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "citation_person_field": ["birth", "death"],"confidence_level": ["confirmed", "family_account", "uncertain"],"date_precision": ["year", "month", "day"],"date_qualifier": ["exact", "about", "before", "after", "between"],"fact_type": ["baptism", "education", "migration", "burial", "occupation", "custom"],"media_type": ["photo", "document"],"name_type": ["birth", "day", "baptismal", "married", "nickname", "other"],"parent_relationship": ["biological", "adoptive", "step", "foster", "guardian"],"sex_type": ["male", "female", "unknown"],"source_type": ["certificate", "church_record", "oral_account", "letter", "photo", "other"],"union_end_reason": ["divorce", "death", "other"],"union_type": ["customary", "church", "civil", "partnership", "unknown"],"user_role": ["member", "editor", "admin"],"user_status": ["active", "pending", "disabled"]
          }
        }
} as const

