'use client';

import { getStatusVariant, BadgeVariant } from '@/lib/format';

interface StatusBadgeProps {
  status: string;
  label: string;
  size?: 'sm' | 'md';
}

// Цвета фона и текста для каждого варианта бейджа
const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  primary: {
    bg: 'var(--primary-soft)',
    color: 'var(--primary)',
    border: 'var(--primary-soft)',
  },
  success: {
    bg: 'var(--success-soft)',
    color: 'var(--success)',
    border: 'var(--success-soft)',
  },
  warning: {
    bg: 'var(--warning-soft)',
    color: 'var(--warning)',
    border: 'var(--warning-soft)',
  },
  danger: {
    bg: 'var(--danger-soft)',
    color: 'var(--danger)',
    border: 'var(--danger-soft)',
  },
  neutral: {
    bg: 'var(--bg-tint)',
    color: 'var(--text-2)',
    border: 'var(--border)',
  },
};

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const variant = getStatusVariant(status);
  const styles = variantStyles[variant];
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8125rem';

  return (
    <span
      style={{
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        borderRadius: '20px',
        padding,
        fontSize,
        fontWeight: 500,
        display: 'inline-block',
        whiteSpace: 'nowrap',
        lineHeight: '1.4',
      }}
    >
      {label}
    </span>
  );
}
