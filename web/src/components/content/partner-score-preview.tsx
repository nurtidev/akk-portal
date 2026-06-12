import { calculateAgroScore } from '@/lib/agroscore';
import { AGRO_PERSONAS } from '@/data/agroscore-personas';

const BAND_STYLE: Record<string, { bg: string; label: string }> = {
  A: { bg: 'var(--primary)', label: 'Отличный' },
  B: { bg: '#4CAF50', label: 'Хороший' },
  C: { bg: '#C9A21C', label: 'Средний' },
  D: { bg: '#DC2626', label: 'Высокий риск' },
};

export function PartnerScorePreview() {
  const persona = AGRO_PERSONAS[0];
  const result = calculateAgroScore(persona);
  const bandStyle = BAND_STYLE[result.band] ?? BAND_STYLE['C'];

  // Mask IIN: show first 6 chars + *****
  const maskedIin = persona.profile.iin.slice(0, 6) + '*****';

  // Format pre-approved limit
  const limitLabel = result.preApproved
    ? `${(result.preApproved.limit_tg / 1_000_000).toFixed(0)} млн ₸`
    : null;
  const rateLabel = result.preApproved
    ? `${result.preApproved.rate_pct.toString().replace('.', ',')}% годовых`
    : null;

  return (
    <div
      style={{
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        padding: '1.25rem',
        maxWidth: '480px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.6rem',
              borderRadius: '9999px',
              marginBottom: '0.4rem',
              letterSpacing: '0.02em',
            }}
          >
            Образец данных
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem', margin: 0 }}>
            {persona.profile.name}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '0.15rem 0 0' }}>
            ИИН: {maskedIin}
          </p>
        </div>

        {/* Score block */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1,
              color: bandStyle.bg,
              fontFamily: 'var(--font-display, Montserrat, sans-serif)',
            }}
          >
            {result.score}
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '0.3rem',
              background: bandStyle.bg,
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.55rem',
              borderRadius: '9999px',
            }}
          >
            {result.band} — {bandStyle.label}
          </div>
        </div>
      </div>

      {/* Factors */}
      <div style={{ marginBottom: '1rem' }}>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.5rem',
          }}
        >
          Факторы
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {result.factors.map((f) => (
            <li
              key={f.key}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-2)',
                  width: '11rem',
                  flexShrink: 0,
                  lineHeight: 1.3,
                }}
              >
                {f.label}
              </span>
              <div
                style={{
                  width: `${f.contribution}%`,
                  maxWidth: '120px',
                  minWidth: '4px',
                  height: '4px',
                  background: 'var(--primary)',
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>
                {f.contribution}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pre-approved block */}
      {result.preApproved && limitLabel && rateLabel && (
        <div
          style={{
            background: 'var(--primary-tint)',
            borderRadius: 'var(--radius)',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-3)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              Предодобренный лимит
            </p>
            <p
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--primary)',
                margin: '0.1rem 0 0',
                fontFamily: 'var(--font-display, Montserrat, sans-serif)',
              }}
            >
              {limitLabel}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-3)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              Ставка
            </p>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text)',
                margin: '0.1rem 0 0',
              }}
            >
              {rateLabel}
            </p>
          </div>
        </div>
      )}

      {/* Footer disclaimer */}
      <p
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-3)',
          lineHeight: 1.4,
          margin: 0,
          borderTop: '1px solid var(--border-soft)',
          paddingTop: '0.6rem',
        }}
      >
        Данные синтетические. Реальная передача — только с согласия клиента (ЗРК о персональных данных).
      </p>
    </div>
  );
}
