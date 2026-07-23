export interface Database {
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string;
          value: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Record<string, unknown>;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_config"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          role: string;
          onboarded: boolean;
          preferences: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          avatar_url?: string | null;
          role?: string;
          onboarded?: boolean;
          preferences?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          slug: string;
          bridge_key: string;
          name: string;
          description: string;
          icon_name: string;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          metrics: Array<{ key: string; label: string; description: string }>;
          sample_prompts: string[];
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["modules"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [];
      };
      user_modules: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          status: string;
          subscribed_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          module_id: string;
          status?: string;
          expires_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_modules"]["Insert"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          module_id: string | null;
          module_slug: string | null;
          name: string;
          notes: string;
          status: string;
          duration: number;
          chunk_count: number;
          word_count: number;
          metric_scores: Record<string, number>;
          summary: string | null;
          started_at: string | null;
          ended_at: string | null;
          project_id: string | null;
          last_chunk_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id?: string | null;
          module_slug?: string | null;
          name: string;
          notes?: string;
          status?: string;
          duration?: number;
          chunk_count?: number;
          word_count?: number;
          metric_scores?: Record<string, number>;
          summary?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          project_id?: string | null;
          last_chunk_index?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      transcript_segments: {
        Row: {
          id: string;
          session_id: string;
          speaker: number;
          text: string;
          start_time: number;
          end_time: number;
          confidence: number;
          chunk_index: number;
          created_at: string;
        };
        Insert: {
          session_id: string;
          speaker: number;
          text: string;
          start_time: number;
          end_time: number;
          confidence?: number;
          chunk_index?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["transcript_segments"]["Insert"]
        >;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          title: string;
          model: string;
          system_prompt: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          title?: string;
          model?: string;
          system_prompt?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["conversations"]["Insert"]
        >;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          role: string;
          content: string;
          token_count?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      metric_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          is_system: boolean;
          metrics: Array<{ key: string; label: string; description: string }>;
          module_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          created_by?: string | null;
          is_system?: boolean;
          metrics?: Array<{ key: string; label: string; description: string }>;
          module_slug?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["metric_templates"]["Insert"]
        >;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          template_id: string;
          name: string;
          description: string | null;
          module_slug: string | null;
          goal_prompt: string | null;
          template_locked: boolean;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          template_id: string;
          name: string;
          description?: string | null;
          module_slug?: string | null;
          goal_prompt?: string | null;
          template_locked?: boolean;
          status?: "active" | "archived";
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscriptions"]["Insert"]
        >;
        Relationships: [];
      };
      educational_content: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: "video" | "article" | "guide";
          content_url: string | null;
          content_body: string | null;
          thumbnail_url: string | null;
          module_slug: string | null;
          tags: string[];
          display_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string | null;
          type: "video" | "article" | "guide";
          content_url?: string | null;
          content_body?: string | null;
          thumbnail_url?: string | null;
          module_slug?: string | null;
          tags?: string[];
          display_order?: number;
          is_published?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["educational_content"]["Insert"]
        >;
        Relationships: [];
      };
      // Standalone blog authoring table. Mirrors the web repo's `blog_posts`
      // migration; blogs live here (not on educational_content) so they can
      // carry SEO/scheduling fields without polluting the learn schema.
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string | null;
          body: string;
          thumbnail_url: string | null;
          module_slug: string | null;
          tags: string[];
          author: string | null;
          meta_description: string | null;
          canonical_url: string | null;
          reading_time: number | null;
          is_published: boolean;
          published_at: string | null;
          scheduled_for: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary?: string | null;
          body?: string;
          thumbnail_url?: string | null;
          module_slug?: string | null;
          tags?: string[];
          author?: string | null;
          meta_description?: string | null;
          canonical_url?: string | null;
          reading_time?: number | null;
          is_published?: boolean;
          published_at?: string | null;
          scheduled_for?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [];
      };
      // Persona Atlas: leadership archetypes surfaced in the web app. Managed
      // from the admin panel alongside blog posts; the shared Atlas PDF lives
      // in the public `persona-atlas` storage bucket (see features/personas).
      personas: {
        Row: {
          id: string;
          slug: string;
          name: string;
          archetype_title: string | null;
          summary: string | null;
          metrics: { key: string; label: string; description: string }[];
          leadership_context: string | null;
          communication_style: string | null;
          display_order: number;
          is_published: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          archetype_title?: string | null;
          summary?: string | null;
          metrics?: { key: string; label: string; description: string }[];
          leadership_context?: string | null;
          communication_style?: string | null;
          display_order?: number;
          is_published?: boolean;
          created_by?: string | null;
          // Writable so the service layer can stamp it on update (no trigger
          // is assumed); the DB default covers inserts that omit it.
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["personas"]["Insert"]>;
        Relationships: [];
      };
      chunk_assessments: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          project_id: string | null;
          chunk_index: number;
          chunk_id: string;
          status: "completed" | "accumulating";
          raw_incidence: Record<string, number>;
          normalized_scores: Record<string, number>;
          project_max_incident_count: number;
          rows_accumulated: number;
          engine_triggered: boolean;
          alerts: unknown[];
          cube_output: unknown | null;
          processing_time: number | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          project_id?: string | null;
          chunk_index: number;
          chunk_id: string;
          status: "completed" | "accumulating";
          raw_incidence?: Record<string, number>;
          normalized_scores?: Record<string, number>;
          project_max_incident_count?: number;
          rows_accumulated?: number;
          engine_triggered?: boolean;
          alerts?: unknown[];
          cube_output?: unknown | null;
          processing_time?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["chunk_assessments"]["Insert"]
        >;
        Relationships: [];
      };
      session_final_analyses: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          project_id: string | null;
          module_slug: string;
          target_speaker: string;
          dimensions: Record<
            string,
            {
              observedEvidence: string;
              interpretation: string;
              overallScore: number;
              behavioralImplications: string;
            }
          >;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id?: string | null;
          project_id?: string | null;
          module_slug: string;
          target_speaker?: string;
          dimensions: Record<string, unknown>;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_final_analyses"]["Insert"]
        >;
        Relationships: [];
      };
      session_warmups: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          module_slug: string;
          transcript: unknown[];
          baseline_scores: Record<string, number>;
          question_count: number;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          module_slug: string;
          transcript?: unknown[];
          baseline_scores?: Record<string, number>;
          question_count?: number;
          duration_seconds?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_warmups"]["Insert"]
        >;
        Relationships: [];
      };
      psychometric_scales: {
        Row: {
          id: string;
          key: string;
          label: string;
          description: string | null;
          anchor_low: string;
          anchor_high: string;
          category: string | null;
          is_system: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          label: string;
          description?: string | null;
          anchor_low: string;
          anchor_high: string;
          category?: string | null;
          is_system?: boolean;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["psychometric_scales"]["Insert"]
        >;
        Relationships: [];
      };
      session_deep_analyses: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          dimension_key: string | null;
          analysis: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          dimension_key?: string | null;
          analysis?: Record<string, unknown>;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_deep_analyses"]["Insert"]
        >;
        Relationships: [];
      };
      // Bias profile snapshot per session. The table may not exist in every
      // environment yet -- callers must tolerate "relation does not exist".
      session_bias_profiles: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          profile: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id?: string | null;
          profile?: Record<string, unknown>;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_bias_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      project_qa: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          question: string;
          answer: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          question: string;
          answer: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_qa"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
