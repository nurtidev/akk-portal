import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ContentPage } from '@/components/content/content-page';
import { StandaloneCalculator } from '@/components/products/standalone-calculator';

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'content.calculator.meta' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: { title: t('title'), description: t('description') },
  };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'content' });
  const tc = await getTranslations({ locale, namespace: 'content.calculator' });

  return (
    <ContentPage
      title={tc('title')}
      subtitle={tc('subtitle')}
      breadcrumbs={[{ label: t('breadcrumbs.home'), href: `/${locale}` }, { label: tc('title') }]}
    >
      <StandaloneCalculator />

      {/* Не знаете программу → отправляем в подбор (квиз) на главной */}
      <div className="mt-10 flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-2)]">{tc('quizHint')}</p>
        <Link
          href={`/${locale}#quiz`}
          className="inline-flex h-11 flex-shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--primary)] transition hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          {tc('quizCta')}
        </Link>
      </div>
    </ContentPage>
  );
}
