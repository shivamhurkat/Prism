export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          role: string | null
          team_size: string | null
          industry: string | null
          primary_use_case: string | null
          onboarded_at: string | null
          preferred_provider: 'anthropic' | 'google'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          role?: string | null
          team_size?: string | null
          industry?: string | null
          primary_use_case?: string | null
          onboarded_at?: string | null
          preferred_provider?: 'anthropic' | 'google'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          role?: string | null
          team_size?: string | null
          industry?: string | null
          primary_use_case?: string | null
          onboarded_at?: string | null
          preferred_provider?: 'anthropic' | 'google'
          updated_at?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          id: string
          user_id: string
          title: string
          question: string | null
          context_text: string | null
          status: 'draft' | 'configuring' | 'ready' | 'running' | 'completed' | 'archived' | 'failed'
          cost_estimate_usd: number | null
          actual_cost_usd: number | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          question?: string | null
          context_text?: string | null
          status?: 'draft' | 'configuring' | 'ready' | 'running' | 'completed' | 'archived' | 'failed'
          cost_estimate_usd?: number | null
          actual_cost_usd?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          title?: string
          question?: string | null
          context_text?: string | null
          status?: 'draft' | 'configuring' | 'ready' | 'running' | 'completed' | 'archived' | 'failed'
          cost_estimate_usd?: number | null
          actual_cost_usd?: number | null
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      decision_files: {
        Row: {
          id: string
          decision_id: string
          storage_path: string
          file_name: string
          file_type: string | null
          byte_size: number | null
          extracted_text: string | null
          parse_status: 'pending' | 'parsing' | 'ready' | 'failed' | 'skipped'
          parse_skipped_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          storage_path: string
          file_name: string
          file_type?: string | null
          byte_size?: number | null
          extracted_text?: string | null
          parse_status?: 'pending' | 'parsing' | 'ready' | 'failed' | 'skipped'
          parse_skipped_reason?: string | null
          created_at?: string
        }
        Update: {
          storage_path?: string
          file_name?: string
          file_type?: string | null
          byte_size?: number | null
          extracted_text?: string | null
          parse_status?: 'pending' | 'parsing' | 'ready' | 'failed' | 'skipped'
          parse_skipped_reason?: string | null
        }
        Relationships: []
      }
      decision_clarifications: {
        Row: {
          id: string
          decision_id: string
          question: string
          suggested_answers: Json
          user_answer: string | null
          position: number
          generation_id: string
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          question: string
          suggested_answers?: Json
          user_answer?: string | null
          position?: number
          generation_id: string
          created_at?: string
        }
        Update: {
          question?: string
          suggested_answers?: Json
          user_answer?: string | null
          position?: number
        }
        Relationships: []
      }
      agent_charters: {
        Row: {
          id: string
          decision_id: string
          name: string
          role: string | null
          perspective: string | null
          biases: string | null
          locked: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          name: string
          role?: string | null
          perspective?: string | null
          biases?: string | null
          locked?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          name?: string
          role?: string | null
          perspective?: string | null
          biases?: string | null
          locked?: boolean
          position?: number
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          id: string
          decision_id: string
          name: string
          description: string | null
          assumptions: string | null
          time_horizon: string | null
          locked: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          name: string
          description?: string | null
          assumptions?: string | null
          time_horizon?: string | null
          locked?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          assumptions?: string | null
          time_horizon?: string | null
          locked?: boolean
          position?: number
        }
        Relationships: []
      }
      runs: {
        Row: {
          id: string
          decision_id: string
          status: 'pending' | 'running' | 'synthesizing' | 'completed' | 'failed'
          progress_pct: number
          started_at: string | null
          completed_at: string | null
          total_input_tokens: number
          total_output_tokens: number
          total_cost_usd: number
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          status?: 'pending' | 'running' | 'synthesizing' | 'completed' | 'failed'
          progress_pct?: number
          started_at?: string | null
          completed_at?: string | null
          total_input_tokens?: number
          total_output_tokens?: number
          total_cost_usd?: number
          error_message?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'running' | 'synthesizing' | 'completed' | 'failed'
          progress_pct?: number
          started_at?: string | null
          completed_at?: string | null
          total_input_tokens?: number
          total_output_tokens?: number
          total_cost_usd?: number
          error_message?: string | null
        }
        Relationships: []
      }
      run_tasks: {
        Row: {
          id: string
          run_id: string
          agent_charter_id: string | null
          scenario_id: string | null
          kind: 'analysis' | 'critique' | 'synthesis'
          status: 'pending' | 'running' | 'completed' | 'failed'
          output: string | null
          input_tokens: number | null
          output_tokens: number | null
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          agent_charter_id?: string | null
          scenario_id?: string | null
          kind: 'analysis' | 'critique' | 'synthesis'
          status?: 'pending' | 'running' | 'completed' | 'failed'
          output?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'running' | 'completed' | 'failed'
          output?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      run_synthesis: {
        Row: {
          id: string
          run_id: string
          verdict: string | null
          confidence_pct: number | null
          top_risks: Json | null
          decision_criteria: Json | null
          what_would_change_my_mind: string | null
          summary_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          verdict?: string | null
          confidence_pct?: number | null
          top_risks?: Json | null
          decision_criteria?: Json | null
          what_would_change_my_mind?: string | null
          summary_text?: string | null
          created_at?: string
        }
        Update: {
          verdict?: string | null
          confidence_pct?: number | null
          top_risks?: Json | null
          decision_criteria?: Json | null
          what_would_change_my_mind?: string | null
          summary_text?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: string
          encrypted_key: string
          last_validated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          encrypted_key: string
          last_validated_at?: string | null
          created_at?: string
        }
        Update: {
          provider?: string
          encrypted_key?: string
          last_validated_at?: string | null
        }
        Relationships: []
      }
      outcomes: {
        Row: {
          id: string
          decision_id: string
          decision_made: string | null
          actual_outcome: string | null
          lessons: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          decision_made?: string | null
          actual_outcome?: string | null
          lessons?: string | null
          recorded_at?: string
        }
        Update: {
          decision_made?: string | null
          actual_outcome?: string | null
          lessons?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          user_id: string | null
          event_name: string
          properties: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_name: string
          properties?: Json
          created_at?: string
        }
        Update: {
          properties?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type DecisionStatus = Tables<'decisions'>['status']
export type RunStatus = Tables<'runs'>['status']
export type ParseStatus = Tables<'decision_files'>['parse_status']
