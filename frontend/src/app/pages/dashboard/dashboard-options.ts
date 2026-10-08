import type { DashboardSectionKey, OrderStatus, ReservationStatus } from './dashboard.models';

export const adminSections: { label: string; key: DashboardSectionKey }[] = [
  { label: 'Vue generale', key: 'overview' },
  { label: 'Services', key: 'services' },
  { label: 'Boutique', key: 'shop' },
  { label: 'Commandes', key: 'orders' },
  { label: 'Galerie', key: 'gallery' },
  { label: 'Uploads', key: 'uploads' },
  { label: 'Messages', key: 'messages' },
  { label: 'Clients', key: 'customers' },
  { label: 'Parametres', key: 'settings' },
];

export const reservationStatusOptions: { value: ReservationStatus; label: string }[] = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'confirme', label: 'Confirme' },
  { value: 'annulee', label: 'Annulee' },
  { value: 'autre_horaire', label: 'Autre horaire' },
];

export const orderStatusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'nouvelle', label: 'Nouvelle' },
  { value: 'confirmee', label: 'Confirmee' },
  { value: 'en_preparation', label: 'En preparation' },
  { value: 'livree', label: 'Livree' },
  { value: 'annulee', label: 'Annulee' },
];

export function orderStatusLabel(status: OrderStatus): string {
  return orderStatusOptions.find((option) => option.value === status)?.label || status;
}

export function reservationStatusLabel(status: ReservationStatus): string {
  return reservationStatusOptions.find((option) => option.value === status)?.label || status;
}

