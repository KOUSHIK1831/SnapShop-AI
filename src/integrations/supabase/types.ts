export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      feedback: {
        Row: {
          admin_response: string | null;
          content: string;
          created_at: string;
          id: string;
          seller_id: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          admin_response?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          seller_id?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          admin_response?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          seller_id?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'sellers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      files: {
        Row: {
          created_at: string;
          file_type: string | null;
          file_url: string;
          id: string;
          seller_id: string;
          status: string | null;
        };
        Insert: {
          created_at?: string;
          file_type?: string | null;
          file_url: string;
          id?: string;
          seller_id: string;
          status?: string | null;
        };
        Update: {
          created_at?: string;
          file_type?: string | null;
          file_url?: string;
          id?: string;
          seller_id?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'files_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'sellers';
            referencedColumns: ['id'];
          },
        ];
      };
      order_tracking_logs: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          description: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          description?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          description?: string | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_tracking_logs_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          buyer_id: string | null;
          buyer_name: string | null;
          buyer_phone: string | null;
          confirmed_at: string | null;
          completed_at: string | null;
          created_at: string;
          delivery_address: {
            name: string;
            phone: string;
            line1: string;
            city: string;
            state: string;
            pincode: string;
          } | null;
          id: string;
          product_id: string | null;
          quantity: number;
          seller_id: string;
          status: string | null;
          del_type: Database['public']['Enums']['delivery_type'] | null;
          tracking_provider: string | null;
          tracking_number: string | null;
          delivery_person_name: string | null;
          delivery_person_phone: string | null;
          pay_method: Database['public']['Enums']['payment_method'] | null;
          pay_status: Database['public']['Enums']['payment_status'] | null;
          gateway_payment_id: string | null;
        };
        Insert: {
          buyer_id?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          confirmed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          delivery_address?: {
            name: string;
            phone: string;
            line1: string;
            city: string;
            state: string;
            pincode: string;
          } | null;
          id?: string;
          product_id?: string | null;
          quantity?: number;
          seller_id: string;
          status?: string | null;
          del_type?: Database['public']['Enums']['delivery_type'] | null;
          tracking_provider?: string | null;
          tracking_number?: string | null;
          delivery_person_name?: string | null;
          delivery_person_phone?: string | null;
          pay_method?: Database['public']['Enums']['payment_method'] | null;
          pay_status?: Database['public']['Enums']['payment_status'] | null;
          gateway_payment_id?: string | null;
        };
        Update: {
          buyer_id?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          confirmed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          delivery_address?: {
            name: string;
            phone: string;
            line1: string;
            city: string;
            state: string;
            pincode: string;
          } | null;
          id?: string;
          product_id?: string | null;
          quantity?: number;
          seller_id?: string;
          status?: string | null;
          del_type?: Database['public']['Enums']['delivery_type'] | null;
          tracking_provider?: string | null;
          tracking_number?: string | null;
          delivery_person_name?: string | null;
          delivery_person_phone?: string | null;
          pay_method?: Database['public']['Enums']['payment_method'] | null;
          pay_status?: Database['public']['Enums']['payment_status'] | null;
          gateway_payment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'sellers';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          low_stock_threshold: number | null;
          price: number;
          seller_id: string;
          size: string | null;
          discount_percent: number | null;
          stock: number;
          tags: string[] | null;
          title: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          low_stock_threshold?: number | null;
          price: number;
          seller_id: string;
          size?: string | null;
          discount_percent?: number | null;
          stock?: number;
          tags?: string[] | null;
          title: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          low_stock_threshold?: number | null;
          price?: number;
          seller_id?: string;
          size?: string | null;
          discount_percent?: number | null;
          stock?: number;
          tags?: string[] | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'sellers';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_blocked: boolean | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          is_blocked?: boolean | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_blocked?: boolean | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sellers: {
        Row: {
          banner_url: string | null;
          contact_number: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          location: string | null;
          maps_url: string | null;
          phone: string | null;
          status: string | null;
          store_description: string | null;
          store_name: string | null;
          store_number: string | null;
          store_slug: string | null;
          theme_color: string | null;
          user_id: string;
        };
        Insert: {
          banner_url?: string | null;
          contact_number?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          location?: string | null;
          maps_url?: string | null;
          phone?: string | null;
          status?: string | null;
          store_description?: string | null;
          store_name?: string | null;
          store_number?: string | null;
          store_slug?: string | null;
          theme_color?: string | null;
          user_id: string;
        };
        Update: {
          banner_url?: string | null;
          contact_number?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          location?: string | null;
          maps_url?: string | null;
          phone?: string | null;
          status?: string | null;
          store_description?: string | null;
          store_name?: string | null;
          store_number?: string | null;
          store_slug?: string | null;
          theme_color?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      delivery_type: 'courier' | 'self_delivery';
      payment_method: 'cod' | 'online';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
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
