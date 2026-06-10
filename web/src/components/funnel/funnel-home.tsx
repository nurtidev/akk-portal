'use client';

import { FunnelRoot } from './funnel-root';
import { funnelSubmitAdapter } from '@/lib/api';

// Стыковка треков B и D: реальная подача заявки (POST /applications через
// Go-бэкенд) пробрасывается в воронку. Функцию нельзя передать из серверного
// page.tsx — поэтому клиентская обёртка.
export function FunnelHome() {
  return <FunnelRoot submitApplication={funnelSubmitAdapter} />;
}
