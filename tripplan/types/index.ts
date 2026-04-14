export type PlanKey = 'free' | 'premium' | 'vip';

export const PLAN_LABELS: Record<PlanKey, string> = {
  free:    'Бесплатная',
  premium: 'Премиум',
  vip:     'VIP',
};

export interface Profile {
  id: string;
  name: string;
  email: string;
  invite_code?: string;
  created_at?: string;
  plan?: PlanKey;
  plan_expires_at?: string | null;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  country: string;
  city: string;
  start_date: string;
  end_date: string;
  status: TripStatus;
  budget?: number;
  saved_amount?: number;
  status_changed_at?: string;
  created_at?: string;
  updated_at?: string;
  /** true when the trip was created locally and hasn't been synced to Supabase yet */
  _pending?: boolean;
}

export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'postponed' | 'cancelled' | 'completed';

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planning:  'Планируется',
  confirmed: 'Подтверждена',
  ongoing:   'В пути',
  postponed: 'Перенесена',
  cancelled: 'Отменена',
  completed: 'Завершена',
};

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  planning:  '#90CAF9',
  confirmed: '#A5D6A7',
  ongoing:   '#FFCC80',
  postponed: '#CE93D8',
  cancelled: '#EF9A9A',
  completed: '#80CBC4',
};

export type MemberRole = 'owner' | 'member' | 'viewer';

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner:  'Владелец',
  member: 'Участник',
  viewer: 'Слушатель',
};

export const MEMBER_ROLE_COLORS: Record<MemberRole, string> = {
  owner:  '#90CAF9',
  member: '#A5D6A7',
  viewer: '#FFCC80',
};

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  profile?: Profile;
  created_at?: string;
}

export type PlanItemStatus = 'planned' | 'done' | 'cancelled';

export const PLAN_ITEM_STATUS_LABELS: Record<PlanItemStatus, string> = {
  planned:   'Планируется',
  done:      'Выполнено',
  cancelled: 'Отменено',
};

export const PLAN_ITEM_STATUS_COLORS: Record<PlanItemStatus, string> = {
  planned:   '#90CAF9',
  done:      '#A5D6A7',
  cancelled: '#EF9A9A',
};

export interface PlanItem {
  id: string;
  trip_id: string;
  day_number: number;
  date?: string;        // ISO "YYYY-MM-DD" — конкретная дата мероприятия
  title: string;
  description?: string;
  time?: string;
  location?: string;
  cost?: number;        // стоимость мероприятия (если платное)
  status: PlanItemStatus;
  created_at?: string;
}

export interface BudgetItem {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: BudgetCategory;
  paid_by?: string;
  created_at?: string;
}

export type BudgetCategory = 'transport' | 'accommodation' | 'food' | 'activities' | 'shopping' | 'other';

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  transport: 'Транспорт',
  accommodation: 'Проживание',
  food: 'Питание',
  activities: 'Развлечения',
  shopping: 'Покупки',
  other: 'Прочее',
};

export const BUDGET_CATEGORY_ICONS: Record<BudgetCategory, string> = {
  transport: 'airplane',
  accommodation: 'bed',
  food: 'restaurant',
  activities: 'ticket',
  shopping: 'bag',
  other: 'ellipsis-horizontal',
};

export type NotificationType = 'trip_added' | 'trip_removed' | 'trip_cancelled';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  trip_id: string | null;
  trip_title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  owner_id: string;
  name: string;
  created_at?: string;
}

export interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string;
  profile?: Profile;
  created_at?: string;
}

export type NoteType = 'system' | 'manual';

export interface TripNote {
  id: string;
  trip_id: string;
  user_id?: string;
  type: NoteType;
  content: string;
  author_name?: string;
  created_at: string;
}
