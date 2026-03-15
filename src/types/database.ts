export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      account: {
        Row: {
          accessToken: string | null;
          accessTokenExpiresAt: string | null;
          accountId: string;
          createdAt: string;
          id: string;
          idToken: string | null;
          password: string | null;
          providerId: string;
          refreshToken: string | null;
          refreshTokenExpiresAt: string | null;
          scope: string | null;
          updatedAt: string;
          userId: string;
        };
        Insert: {
          accessToken?: string | null;
          accessTokenExpiresAt?: string | null;
          accountId: string;
          createdAt?: string;
          id: string;
          idToken?: string | null;
          password?: string | null;
          providerId: string;
          refreshToken?: string | null;
          refreshTokenExpiresAt?: string | null;
          scope?: string | null;
          updatedAt: string;
          userId: string;
        };
        Update: {
          accessToken?: string | null;
          accessTokenExpiresAt?: string | null;
          accountId?: string;
          createdAt?: string;
          id?: string;
          idToken?: string | null;
          password?: string | null;
          providerId?: string;
          refreshToken?: string | null;
          refreshTokenExpiresAt?: string | null;
          scope?: string | null;
          updatedAt?: string;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_userId_fkey';
            columns: ['userId'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      alert_delivery_logs: {
        Row: {
          alert_id: string;
          channel: string;
          created_at: string | null;
          data: Json | null;
          delivered_at: string | null;
          id: string;
          message_id: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          alert_id: string;
          channel: string;
          created_at?: string | null;
          data?: Json | null;
          delivered_at?: string | null;
          id?: string;
          message_id?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          alert_id?: string;
          channel?: string;
          created_at?: string | null;
          data?: Json | null;
          delivered_at?: string | null;
          id?: string;
          message_id?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alert_delivery_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      alert_triggers: {
        Row: {
          alert_id: string | null;
          data: Json;
          id: string;
          price_alert_id: string | null;
          sentiment: string | null;
          summary: string | null;
          triggered_at: string;
          type: string;
          user_id: string;
        };
        Insert: {
          alert_id?: string | null;
          data: Json;
          id?: string;
          price_alert_id?: string | null;
          sentiment?: string | null;
          summary?: string | null;
          triggered_at?: string;
          type: string;
          user_id: string;
        };
        Update: {
          alert_id?: string | null;
          data?: Json;
          id?: string;
          price_alert_id?: string | null;
          sentiment?: string | null;
          summary?: string | null;
          triggered_at?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alert_triggers_alert_id_fkey';
            columns: ['alert_id'];
            isOneToOne: false;
            referencedRelation: 'social_alerts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alert_triggers_price_alert_id_fkey';
            columns: ['price_alert_id'];
            isOneToOne: false;
            referencedRelation: 'price_alerts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alert_triggers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      api_keys: {
        Row: {
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          name: string;
          rate_limit: number;
          scopes: string[];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          rate_limit?: number;
          scopes?: string[];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          rate_limit?: number;
          scopes?: string[];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_keys_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      api_request_logs: {
        Row: {
          api_key_id: string;
          created_at: string | null;
          endpoint: string;
          id: string;
          method: string;
          status_code: number;
        };
        Insert: {
          api_key_id: string;
          created_at?: string | null;
          endpoint: string;
          id?: string;
          method: string;
          status_code: number;
        };
        Update: {
          api_key_id?: string;
          created_at?: string | null;
          endpoint?: string;
          id?: string;
          method?: string;
          status_code?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'api_request_logs_api_key_id_fkey';
            columns: ['api_key_id'];
            isOneToOne: false;
            referencedRelation: 'api_keys';
            referencedColumns: ['id'];
          },
        ];
      };
      composite_alerts: {
        Row: {
          conditions: Json;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_evaluated_at: string | null;
          name: string;
          time_window_minutes: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          conditions: Json;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_evaluated_at?: string | null;
          name: string;
          time_window_minutes?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          conditions?: Json;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_evaluated_at?: string | null;
          name?: string;
          time_window_minutes?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'composite_alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      composite_condition_events: {
        Row: {
          composite_alert_id: string;
          condition_index: number;
          id: string;
          occurred_at: string | null;
          trigger_data: Json;
        };
        Insert: {
          composite_alert_id: string;
          condition_index: number;
          id?: string;
          occurred_at?: string | null;
          trigger_data: Json;
        };
        Update: {
          composite_alert_id?: string;
          condition_index?: number;
          id?: string;
          occurred_at?: string | null;
          trigger_data?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'composite_condition_events_composite_alert_id_fkey';
            columns: ['composite_alert_id'];
            isOneToOne: false;
            referencedRelation: 'composite_alerts';
            referencedColumns: ['id'];
          },
        ];
      };
      conditional_rules: {
        Row: {
          config: Json;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          rule_type: string;
          time_window_minutes: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          config: Json;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          rule_type: string;
          time_window_minutes?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          config?: Json;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          rule_type?: string;
          time_window_minutes?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conditional_rules_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      influencer_events: {
        Row: {
          account: string;
          binance_symbol: string;
          created_at: string | null;
          id: string;
          price_after_1h: number | null;
          price_after_24h: number | null;
          price_at_mention: number;
          processed: boolean | null;
          scored: boolean;
          token_symbol: string;
          tweet_id: string;
        };
        Insert: {
          account: string;
          binance_symbol?: string;
          created_at?: string | null;
          id?: string;
          price_after_1h?: number | null;
          price_after_24h?: number | null;
          price_at_mention: number;
          processed?: boolean | null;
          scored?: boolean;
          token_symbol: string;
          tweet_id: string;
        };
        Update: {
          account?: string;
          binance_symbol?: string;
          created_at?: string | null;
          id?: string;
          price_after_1h?: number | null;
          price_after_24h?: number | null;
          price_at_mention?: number;
          processed?: boolean | null;
          scored?: boolean;
          token_symbol?: string;
          tweet_id?: string;
        };
        Relationships: [];
      };
      influencer_scores: {
        Row: {
          account: string;
          accuracy: number | null;
          avg_price_change_1h: number | null;
          avg_price_change_24h: number | null;
          correct_calls: number | null;
          id: string;
          last_updated_at: string | null;
          positive_calls: number | null;
          sample_count: number | null;
          token_symbol: string;
          total_calls: number | null;
          updated_at: string | null;
        };
        Insert: {
          account: string;
          accuracy?: number | null;
          avg_price_change_1h?: number | null;
          avg_price_change_24h?: number | null;
          correct_calls?: number | null;
          id?: string;
          last_updated_at?: string | null;
          positive_calls?: number | null;
          sample_count?: number | null;
          token_symbol: string;
          total_calls?: number | null;
          updated_at?: string | null;
        };
        Update: {
          account?: string;
          accuracy?: number | null;
          avg_price_change_1h?: number | null;
          avg_price_change_24h?: number | null;
          correct_calls?: number | null;
          id?: string;
          last_updated_at?: string | null;
          positive_calls?: number | null;
          sample_count?: number | null;
          token_symbol?: string;
          total_calls?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      notification_channels: {
        Row: {
          alert_types: string[] | null;
          channel_type: string;
          config: Json;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          alert_types?: string[] | null;
          channel_type: string;
          config?: Json;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          alert_types?: string[] | null;
          channel_type?: string;
          config?: Json;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_channels_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      price_alerts: {
        Row: {
          binance_symbol: string;
          created_at: string;
          direction: Database['public']['Enums']['price_direction'];
          id: string;
          is_active: boolean;
          last_triggered_at: string | null;
          logo: string;
          recurring: boolean;
          symbol: string;
          target_price: number;
          triggered_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          binance_symbol: string;
          created_at?: string;
          direction: Database['public']['Enums']['price_direction'];
          id?: string;
          is_active?: boolean;
          last_triggered_at?: string | null;
          logo?: string;
          recurring?: boolean;
          symbol: string;
          target_price: number;
          triggered_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          binance_symbol?: string;
          created_at?: string;
          direction?: Database['public']['Enums']['price_direction'];
          id?: string;
          is_active?: boolean;
          last_triggered_at?: string | null;
          logo?: string;
          recurring?: boolean;
          symbol?: string;
          target_price?: number;
          triggered_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      session: {
        Row: {
          createdAt: string;
          expiresAt: string;
          id: string;
          ipAddress: string | null;
          token: string;
          updatedAt: string;
          userAgent: string | null;
          userId: string;
        };
        Insert: {
          createdAt?: string;
          expiresAt: string;
          id: string;
          ipAddress?: string | null;
          token: string;
          updatedAt: string;
          userAgent?: string | null;
          userId: string;
        };
        Update: {
          createdAt?: string;
          expiresAt?: string;
          id?: string;
          ipAddress?: string | null;
          token?: string;
          updatedAt?: string;
          userAgent?: string | null;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'session_userId_fkey';
            columns: ['userId'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      social_alerts: {
        Row: {
          account: string;
          call_enabled: boolean;
          created_at: string;
          id: string;
          is_active: boolean;
          keywords: string[];
          platform: string;
          sentiment_filter: string | null;
          telegram_conversation_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          account: string;
          call_enabled?: boolean;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          keywords: string[];
          platform?: string;
          sentiment_filter?: string | null;
          telegram_conversation_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          account?: string;
          call_enabled?: boolean;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          keywords?: string[];
          platform?: string;
          sentiment_filter?: string | null;
          telegram_conversation_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'social_alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      user: {
        Row: {
          createdAt: string;
          email: string;
          emailVerified: boolean;
          id: string;
          image: string | null;
          name: string;
          updatedAt: string;
        };
        Insert: {
          createdAt?: string;
          email: string;
          emailVerified: boolean;
          id: string;
          image?: string | null;
          name: string;
          updatedAt?: string;
        };
        Update: {
          createdAt?: string;
          email?: string;
          emailVerified?: boolean;
          id?: string;
          image?: string | null;
          name?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      user_plans: {
        Row: {
          created_at: string | null;
          plan: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          plan?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          plan?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      user_portfolios: {
        Row: {
          amount: number;
          avg_buy_price: number;
          binance_symbol: string;
          created_at: string;
          id: string;
          symbol: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          avg_buy_price: number;
          binance_symbol: string;
          created_at?: string;
          id?: string;
          symbol: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          avg_buy_price?: number;
          binance_symbol?: string;
          created_at?: string;
          id?: string;
          symbol?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_portfolios_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      user_telegram_settings: {
        Row: {
          created_at: string | null;
          id: string;
          status: string | null;
          telegram_chat_id: string | null;
          telegram_username: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          status?: string | null;
          telegram_chat_id?: string | null;
          telegram_username?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          status?: string | null;
          telegram_chat_id?: string | null;
          telegram_username?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_telegram_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      verification: {
        Row: {
          createdAt: string;
          expiresAt: string;
          id: string;
          identifier: string;
          updatedAt: string;
          value: string;
        };
        Insert: {
          createdAt?: string;
          expiresAt: string;
          id: string;
          identifier: string;
          updatedAt?: string;
          value: string;
        };
        Update: {
          createdAt?: string;
          expiresAt?: string;
          id?: string;
          identifier?: string;
          updatedAt?: string;
          value?: string;
        };
        Relationships: [];
      };
      wallet_alerts: {
        Row: {
          address: string;
          chain: Database['public']['Enums']['chain_type'];
          created_at: string;
          id: string;
          is_active: boolean;
          label: string | null;
          min_value_usd: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          address: string;
          chain: Database['public']['Enums']['chain_type'];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          min_value_usd?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          address?: string;
          chain?: Database['public']['Enums']['chain_type'];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          min_value_usd?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_triggers: {
        Row: {
          data: Json | null;
          from_address: string;
          id: string;
          to_address: string;
          token_symbol: string;
          triggered_at: string | null;
          tx_hash: string;
          user_id: string;
          value_usd: number;
          wallet_alert_id: string;
        };
        Insert: {
          data?: Json | null;
          from_address: string;
          id?: string;
          to_address: string;
          token_symbol: string;
          triggered_at?: string | null;
          tx_hash: string;
          user_id: string;
          value_usd: number;
          wallet_alert_id: string;
        };
        Update: {
          data?: Json | null;
          from_address?: string;
          id?: string;
          to_address?: string;
          token_symbol?: string;
          triggered_at?: string | null;
          tx_hash?: string;
          user_id?: string;
          value_usd?: number;
          wallet_alert_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_triggers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_triggers_wallet_alert_id_fkey';
            columns: ['wallet_alert_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_alerts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      chain_type: 'eth' | 'sol';
      price_direction: 'above' | 'below' | 'exact';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      chain_type: ['eth', 'sol'],
      price_direction: ['above', 'below', 'exact'],
    },
  },
} as const;
