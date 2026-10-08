import type { Product, Service } from '../../shared/catalog-data';

export type DashboardSectionKey =
  | 'overview'
  | 'reservations'
  | 'services'
  | 'shop'
  | 'orders'
  | 'gallery'
  | 'uploads'
  | 'messages'
  | 'customers'
  | 'settings';

export type ReservationStatus = 'en_attente' | 'confirme' | 'annulee' | 'autre_horaire';
export type OrderStatus = 'nouvelle' | 'confirmee' | 'en_preparation' | 'livree' | 'annulee';
export type MessageStatus = 'nouveau' | 'lu' | 'repondu' | 'archive';

export interface Reservation {
  id: number;
  customer_name: string;
  customer_phone: string;
  service: string;
  reservation_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  title: string;
  category: string;
  image: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
}

export interface MediaUpload {
  filename: string;
  url: string;
  size: number;
  content_type: string;
  kind: 'image' | 'video' | 'file';
}

export interface ContactMessage {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  created_at: string;
}

export interface ClientReservationSummary {
  id: number;
  service: string;
  status: string;
  reservation_time: string;
}

export interface ClientOrderSummary {
  id: number;
  status: string;
  total: number;
  delivery_address: string;
  created_at: string;
}

export interface ClientProfile {
  id: string;
  merge_id: number | null;
  display_name: string;
  phones: string[];
  raw_phones: string[];
  addresses: string[];
  reservations_count: number;
  orders_count: number;
  total_spent: number;
  last_activity: string | null;
  services: string[];
  products: string[];
  reservations: ClientReservationSummary[];
  orders: ClientOrderSummary[];
  notes: string | null;
}

export interface SalonInfoSettings {
  salon_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  email: string;
  instagram: string;
  facebook: string;
}

export interface OpeningHourSettings {
  day: string;
  is_open: boolean;
  opens_at: string;
  closes_at: string;
}

export interface ReservationSettings {
  reservations_enabled: boolean;
  slot_duration_minutes: number;
  max_reservations_per_slot: number;
  min_advance_hours: number;
  confirmation_message: string;
}

export interface BoutiqueSettings {
  orders_enabled: boolean;
  delivery_fee: number;
  free_delivery_threshold: number;
  default_order_status: OrderStatus;
  currency: string;
  payment_note: string;
}

export interface DashboardPreferencesSettings {
  default_dashboard_tab: string;
  items_per_page: number;
  show_stats_cards: boolean;
}

export interface BrandingSettings {
  logo_url: string;
  primary_color: string;
  hero_image_url: string;
  short_description: string;
}

export interface SiteSettings {
  salon_info: SalonInfoSettings;
  opening_hours: OpeningHourSettings[];
  reservation: ReservationSettings;
  boutique: BoutiqueSettings;
  dashboard: DashboardPreferencesSettings;
  branding: BrandingSettings;
}

export type AdminProduct = Product;
export type AdminService = Service;

