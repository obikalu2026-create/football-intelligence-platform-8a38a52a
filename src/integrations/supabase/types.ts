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
      competitions: {
        Row: {
          api_id: number
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          season: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          api_id: number
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          season?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: number
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          season?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_weights: {
        Row: {
          feature_name: string
          id: string
          is_active: boolean | null
          last_updated: string | null
          maximum_weight: number | null
          minimum_weight: number | null
          weight: number
        }
        Insert: {
          feature_name: string
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          maximum_weight?: number | null
          minimum_weight?: number | null
          weight: number
        }
        Update: {
          feature_name?: string
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          maximum_weight?: number | null
          minimum_weight?: number | null
          weight?: number
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          api_id: string
          away_score: number | null
          away_team_id: string
          competition_id: string
          created_at: string | null
          home_score: number | null
          home_team_id: string
          id: string
          kickoff_time: string | null
          referee: string | null
          round: string | null
          season_id: string
          status: string | null
          timezone: string | null
          updated_at: string | null
          venue: string | null
          winner: string | null
        }
        Insert: {
          api_id: string
          away_score?: number | null
          away_team_id: string
          competition_id: string
          created_at?: string | null
          home_score?: number | null
          home_team_id: string
          id?: string
          kickoff_time?: string | null
          referee?: string | null
          round?: string | null
          season_id: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          venue?: string | null
          winner?: string | null
        }
        Update: {
          api_id?: string
          away_score?: number | null
          away_team_id?: string
          competition_id?: string
          created_at?: string | null
          home_score?: number | null
          home_team_id?: string
          id?: string
          kickoff_time?: string | null
          referee?: string | null
          round?: string | null
          season_id?: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          venue?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_scores: {
        Row: {
          attack_score: number | null
          away_strength: number | null
          calculated_at: string | null
          competition_id: string | null
          confidence_score: number | null
          defence_score: number | null
          form_score: number | null
          home_strength: number | null
          id: string
          momentum_score: number | null
          overall_score: number | null
          season_id: string | null
          team_id: string | null
        }
        Insert: {
          attack_score?: number | null
          away_strength?: number | null
          calculated_at?: string | null
          competition_id?: string | null
          confidence_score?: number | null
          defence_score?: number | null
          form_score?: number | null
          home_strength?: number | null
          id?: string
          momentum_score?: number | null
          overall_score?: number | null
          season_id?: string | null
          team_id?: string | null
        }
        Update: {
          attack_score?: number | null
          away_strength?: number | null
          calculated_at?: string | null
          competition_id?: string | null
          confidence_score?: number | null
          defence_score?: number | null
          form_score?: number | null
          home_strength?: number | null
          id?: string
          momentum_score?: number | null
          overall_score?: number | null
          season_id?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      league_standings: {
        Row: {
          api_id: string
          competition_id: string
          created_at: string | null
          description: string | null
          draws: number | null
          form: string | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          losses: number | null
          played: number | null
          points: number | null
          position: number | null
          season_id: string
          team_id: string
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          api_id: string
          competition_id: string
          created_at?: string | null
          description?: string | null
          draws?: number | null
          form?: string | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          played?: number | null
          points?: number | null
          position?: number | null
          season_id: string
          team_id: string
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          api_id?: string
          competition_id?: string
          created_at?: string | null
          description?: string | null
          draws?: number | null
          form?: string | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          played?: number | null
          points?: number | null
          position?: number | null
          season_id?: string
          team_id?: string
          updated_at?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "league_standings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_insights: {
        Row: {
          competition_id: string | null
          confidence: number | null
          created_at: string | null
          description: string | null
          id: string
          insight_type: string
          is_active: boolean | null
          matches_supporting: number | null
          season_id: string | null
          title: string
        }
        Insert: {
          competition_id?: string | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          insight_type: string
          is_active?: boolean | null
          matches_supporting?: number | null
          season_id?: string | null
          title: string
        }
        Update: {
          competition_id?: string | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          insight_type?: string
          is_active?: boolean | null
          matches_supporting?: number | null
          season_id?: string | null
          title?: string
        }
        Relationships: []
      }
      learning_cycles: {
        Row: {
          accuracy_after: number | null
          accuracy_before: number | null
          completed_at: string | null
          cycle_number: number
          id: string
          matches_reviewed: number | null
          notes: string | null
          predictions_correct: number | null
          predictions_wrong: number | null
          started_at: string | null
        }
        Insert: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          completed_at?: string | null
          cycle_number?: number
          id?: string
          matches_reviewed?: number | null
          notes?: string | null
          predictions_correct?: number | null
          predictions_wrong?: number | null
          started_at?: string | null
        }
        Update: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          completed_at?: string | null
          cycle_number?: number
          id?: string
          matches_reviewed?: number | null
          notes?: string | null
          predictions_correct?: number | null
          predictions_wrong?: number | null
          started_at?: string | null
        }
        Relationships: []
      }
      learning_feedback: {
        Row: {
          applied: boolean | null
          created_at: string | null
          evidence_score: number | null
          feature_name: string
          id: string
          learning_cycle_id: string | null
          old_weight: number | null
          prediction_id: string | null
          reason: string | null
          suggested_weight: number | null
        }
        Insert: {
          applied?: boolean | null
          created_at?: string | null
          evidence_score?: number | null
          feature_name: string
          id?: string
          learning_cycle_id?: string | null
          old_weight?: number | null
          prediction_id?: string | null
          reason?: string | null
          suggested_weight?: number | null
        }
        Update: {
          applied?: boolean | null
          created_at?: string | null
          evidence_score?: number | null
          feature_name?: string
          id?: string
          learning_cycle_id?: string | null
          old_weight?: number | null
          prediction_id?: string | null
          reason?: string | null
          suggested_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_feedback_learning_cycle_id_fkey"
            columns: ["learning_cycle_id"]
            isOneToOne: false
            referencedRelation: "learning_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_performance: {
        Row: {
          accuracy: number | null
          average_confidence: number | null
          competition_id: string | null
          correct_predictions: number | null
          engine_id: string | null
          id: string
          last_updated: string | null
          market_id: string | null
          season_id: string | null
          total_predictions: number | null
          wrong_predictions: number | null
        }
        Insert: {
          accuracy?: number | null
          average_confidence?: number | null
          competition_id?: string | null
          correct_predictions?: number | null
          engine_id?: string | null
          id?: string
          last_updated?: string | null
          market_id?: string | null
          season_id?: string | null
          total_predictions?: number | null
          wrong_predictions?: number | null
        }
        Update: {
          accuracy?: number | null
          average_confidence?: number | null
          competition_id?: string | null
          correct_predictions?: number | null
          engine_id?: string | null
          id?: string
          last_updated?: string | null
          market_id?: string | null
          season_id?: string | null
          total_predictions?: number | null
          wrong_predictions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_performance_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "prediction_engines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_performance_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_engines: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          version: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          version: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          version?: string
        }
        Relationships: []
      }
      prediction_features: {
        Row: {
          away_attack: number | null
          away_defense: number | null
          away_form: number | null
          away_goal_difference: number | null
          away_points: number | null
          away_position: number | null
          away_power: number | null
          created_at: string | null
          head_to_head_away_wins: number | null
          head_to_head_draws: number | null
          head_to_head_home_wins: number | null
          home_attack: number | null
          home_defense: number | null
          home_form: number | null
          home_goal_difference: number | null
          home_points: number | null
          home_position: number | null
          home_power: number | null
          id: string
          match_difficulty: number | null
          predicted_away_goals: number | null
          predicted_home_goals: number | null
          prediction_id: string
        }
        Insert: {
          away_attack?: number | null
          away_defense?: number | null
          away_form?: number | null
          away_goal_difference?: number | null
          away_points?: number | null
          away_position?: number | null
          away_power?: number | null
          created_at?: string | null
          head_to_head_away_wins?: number | null
          head_to_head_draws?: number | null
          head_to_head_home_wins?: number | null
          home_attack?: number | null
          home_defense?: number | null
          home_form?: number | null
          home_goal_difference?: number | null
          home_points?: number | null
          home_position?: number | null
          home_power?: number | null
          id?: string
          match_difficulty?: number | null
          predicted_away_goals?: number | null
          predicted_home_goals?: number | null
          prediction_id: string
        }
        Update: {
          away_attack?: number | null
          away_defense?: number | null
          away_form?: number | null
          away_goal_difference?: number | null
          away_points?: number | null
          away_position?: number | null
          away_power?: number | null
          created_at?: string | null
          head_to_head_away_wins?: number | null
          head_to_head_draws?: number | null
          head_to_head_home_wins?: number | null
          home_attack?: number | null
          home_defense?: number | null
          home_form?: number | null
          home_goal_difference?: number | null
          home_points?: number | null
          home_position?: number | null
          home_power?: number | null
          id?: string
          match_difficulty?: number | null
          predicted_away_goals?: number | null
          predicted_home_goals?: number | null
          prediction_id?: string
        }
        Relationships: []
      }
      prediction_markets: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      prediction_results: {
        Row: {
          accuracy_score: number | null
          actual_away_score: number | null
          actual_home_score: number | null
          actual_result: string | null
          correct: boolean | null
          evaluated_at: string | null
          id: string
          prediction_id: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_away_score?: number | null
          actual_home_score?: number | null
          actual_result?: string | null
          correct?: boolean | null
          evaluated_at?: string | null
          id?: string
          prediction_id: string
        }
        Update: {
          accuracy_score?: number | null
          actual_away_score?: number | null
          actual_home_score?: number | null
          actual_result?: string | null
          correct?: boolean | null
          evaluated_at?: string | null
          id?: string
          prediction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_results_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          away_score: number | null
          away_team_id: string
          confidence: number | null
          created_at: string | null
          fixture_id: string | null
          home_score: number | null
          home_team_id: string
          id: string
          model_version: string | null
          predicted_result: string
          reasoning: Json | null
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          confidence?: number | null
          created_at?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team_id: string
          id?: string
          model_version?: string | null
          predicted_result: string
          reasoning?: Json | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          confidence?: number | null
          created_at?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team_id?: string
          id?: string
          model_version?: string | null
          predicted_result?: string
          reasoning?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_versions: {
        Row: {
          applied_at: string | null
          name: string
          version: number
        }
        Insert: {
          applied_at?: string | null
          name: string
          version: number
        }
        Update: {
          applied_at?: string | null
          name?: string
          version?: number
        }
        Relationships: []
      }
      seasons: {
        Row: {
          api_id: string
          competition_id: string
          created_at: string | null
          current_season: boolean | null
          end_date: string | null
          id: string
          start_date: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          api_id: string
          competition_id: string
          created_at?: string | null
          current_season?: boolean | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          api_id?: string
          competition_id?: string
          created_at?: string | null
          current_season?: boolean | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_form: {
        Row: {
          btts: boolean | null
          clean_sheet: boolean | null
          competition_id: string | null
          created_at: string | null
          failed_to_score: boolean | null
          fixture_id: string
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          is_home: boolean
          match_date: string
          opponent_id: string | null
          over_15: boolean | null
          over_25: boolean | null
          over_35: boolean | null
          result: string
          season_id: string | null
          team_id: string
        }
        Insert: {
          btts?: boolean | null
          clean_sheet?: boolean | null
          competition_id?: string | null
          created_at?: string | null
          failed_to_score?: boolean | null
          fixture_id: string
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          is_home: boolean
          match_date: string
          opponent_id?: string | null
          over_15?: boolean | null
          over_25?: boolean | null
          over_35?: boolean | null
          result: string
          season_id?: string | null
          team_id: string
        }
        Update: {
          btts?: boolean | null
          clean_sheet?: boolean | null
          competition_id?: string | null
          created_at?: string | null
          failed_to_score?: boolean | null
          fixture_id?: string
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          is_home?: boolean
          match_date?: string
          opponent_id?: string | null
          over_15?: boolean | null
          over_25?: boolean | null
          over_35?: boolean | null
          result?: string
          season_id?: string | null
          team_id?: string
        }
        Relationships: []
      }
      team_power_rankings: {
        Row: {
          attack_power: number | null
          away_power: number | null
          calculated_at: string | null
          competition_id: string | null
          confidence_score: number | null
          defense_power: number | null
          form_power: number | null
          home_power: number | null
          id: string
          momentum_power: number | null
          overall_power: number | null
          season_id: string | null
          team_id: string
        }
        Insert: {
          attack_power?: number | null
          away_power?: number | null
          calculated_at?: string | null
          competition_id?: string | null
          confidence_score?: number | null
          defense_power?: number | null
          form_power?: number | null
          home_power?: number | null
          id?: string
          momentum_power?: number | null
          overall_power?: number | null
          season_id?: string | null
          team_id: string
        }
        Update: {
          attack_power?: number | null
          away_power?: number | null
          calculated_at?: string | null
          competition_id?: string | null
          confidence_score?: number | null
          defense_power?: number | null
          form_power?: number | null
          home_power?: number | null
          id?: string
          momentum_power?: number | null
          overall_power?: number | null
          season_id?: string | null
          team_id?: string
        }
        Relationships: []
      }
      team_statistics: {
        Row: {
          api_id: string
          biggest_loss: string | null
          biggest_win: string | null
          clean_sheets: number | null
          competition_id: string
          created_at: string | null
          draws: number | null
          failed_to_score: number | null
          form: string | null
          goals_against: number | null
          goals_for: number | null
          id: string
          losses: number | null
          matches_played: number | null
          season_id: string
          team_id: string
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          api_id: string
          biggest_loss?: string | null
          biggest_win?: string | null
          clean_sheets?: number | null
          competition_id: string
          created_at?: string | null
          draws?: number | null
          failed_to_score?: number | null
          form?: string | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          season_id: string
          team_id: string
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          api_id?: string
          biggest_loss?: string | null
          biggest_win?: string | null
          clean_sheets?: number | null
          competition_id?: string
          created_at?: string | null
          draws?: number | null
          failed_to_score?: number | null
          form?: string | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          season_id?: string
          team_id?: string
          updated_at?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_statistics_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_statistics_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_statistics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          api_id: string
          code: string | null
          competition_id: string
          country: string | null
          created_at: string | null
          founded: number | null
          id: string
          is_active: boolean | null
          is_national_team: boolean | null
          logo_url: string | null
          name: string
          season_id: string | null
          short_name: string | null
          team_api_id: number
          updated_at: string | null
          venue_capacity: number | null
          venue_city: string | null
          venue_name: string | null
          venue_surface: string | null
        }
        Insert: {
          api_id: string
          code?: string | null
          competition_id: string
          country?: string | null
          created_at?: string | null
          founded?: number | null
          id?: string
          is_active?: boolean | null
          is_national_team?: boolean | null
          logo_url?: string | null
          name: string
          season_id?: string | null
          short_name?: string | null
          team_api_id: number
          updated_at?: string | null
          venue_capacity?: number | null
          venue_city?: string | null
          venue_name?: string | null
          venue_surface?: string | null
        }
        Update: {
          api_id?: string
          code?: string | null
          competition_id?: string
          country?: string | null
          created_at?: string | null
          founded?: number | null
          id?: string
          is_active?: boolean | null
          is_national_team?: boolean | null
          logo_url?: string | null
          name?: string
          season_id?: string | null
          short_name?: string | null
          team_api_id?: number
          updated_at?: string | null
          venue_capacity?: number | null
          venue_city?: string | null
          venue_name?: string | null
          venue_surface?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          api_id: number | null
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          surface: string | null
        }
        Insert: {
          api_id?: number | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          surface?: string | null
        }
        Update: {
          api_id?: number | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          surface?: string | null
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          accuracy_after: number | null
          accuracy_before: number | null
          approved: boolean | null
          changed_at: string | null
          feature_name: string
          feature_weight_id: string | null
          id: string
          learning_cycle_id: string | null
          matches_analyzed: number | null
          new_weight: number
          old_weight: number
          reason: string | null
          weight_change: number | null
        }
        Insert: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          approved?: boolean | null
          changed_at?: string | null
          feature_name: string
          feature_weight_id?: string | null
          id?: string
          learning_cycle_id?: string | null
          matches_analyzed?: number | null
          new_weight: number
          old_weight: number
          reason?: string | null
          weight_change?: number | null
        }
        Update: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          approved?: boolean | null
          changed_at?: string | null
          feature_name?: string
          feature_weight_id?: string | null
          id?: string
          learning_cycle_id?: string | null
          matches_analyzed?: number | null
          new_weight?: number
          old_weight?: number
          reason?: string | null
          weight_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_history_feature_weight_id_fkey"
            columns: ["feature_weight_id"]
            isOneToOne: false
            referencedRelation: "feature_weights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_history_learning_cycle_id_fkey"
            columns: ["learning_cycle_id"]
            isOneToOne: false
            referencedRelation: "learning_cycles"
            referencedColumns: ["id"]
          },
        ]
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
