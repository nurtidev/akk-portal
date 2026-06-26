// Утилиты форматирования значений для отображения в UI

/** Форматировать сумму в тенге: «12 500 000 ₸» */
export function formatTenge(amount: number): string {
  return (
    new Intl.NumberFormat('ru-KZ', {
      maximumFractionDigits: 0,
    }).format(amount) + ' ₸'
  );
}

/** Форматировать ISO-дату в ДД.ММ.ГГГГ */
export function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return iso;
  }
}

/** Варианты цвета бейджа статуса */
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** Маппинг статуса заявки → вариант бейджа */
export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'new':
    case 'scoring_in_progress':
      return 'primary';
    case 'cc_approved':
    case 'disbursed':
    case 'completed':
      return 'success';
    case 'rework':
      return 'warning';
    case 'rejected':
    case 'cancelled':
      return 'danger';
    case 'expertise':
    case 'collateral_valuation':
    case 'contract_signing':
    case 'monitoring':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/** Русские метки статусов */
export const STATUS_LABELS: Record<string, string> = {
  new: 'Регистрация',
  scoring_in_progress: 'Новая',
  expertise: 'На рассмотрении',
  cc_approved: 'Одобрена',
  collateral_valuation: 'Оценка залога',
  contract_signing: 'Договор',
  disbursed: 'Средства выданы',
  monitoring: 'Мониторинг',
  completed: 'Завершена',
  rework: 'На доработке',
  rejected: 'Отказано',
  cancelled: 'Отменено',
};

/** Все статусы в порядке воронки + ветки */
export const STATUS_ORDER = [
  'new',
  'scoring_in_progress',
  'expertise',
  'cc_approved',
  'collateral_valuation',
  'contract_signing',
  'disbursed',
  'monitoring',
  'completed',
  'rework',
  'rejected',
  'cancelled',
];
