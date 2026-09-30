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
          alert_id: string | null;
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
      processed_tweets: {
        Row: {
          account: string;
          processed_at: string;
          tweet_id: string;
        };
        Insert: {
          account: string;
          processed_at?: string;
          tweet_id: string;
        };
        Update: {
          account?: string;
          processed_at?: string;
          tweet_id?: string;
        };
        Relationships: [];
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
          include_replies: boolean;
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
          include_replies?: boolean;
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
          include_replies?: boolean;
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
      user_stream_usage: {
        Row: {
          delivered: number;
          month: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          delivered?: number;
          month: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          delivered?: number;
          month?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_stream_usage_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
      x_stream_usage: {
        Row: {
          delivered: number;
          month: string;
          updated_at: string;
        };
        Insert: {
          delivered?: number;
          month: string;
          updated_at?: string;
        };
        Update: {
          delivered?: number;
          month?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_user_stream_usage: {
        Args: { p_month: string; p_rows: Json };
        Returns: undefined;
      };
      increment_x_stream_usage: {
        Args: { p_month: string; p_count: number };
        Returns: number;
      };
    };
    Enums: {
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
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
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
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
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
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
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
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
      price_direction: ['above', 'below', 'exact'],
    },
  },
} as const;
