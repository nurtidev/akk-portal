'use client';

// =====================================================
// ===== B7: FunnelRoot — клиентская обёртка воронки ===
// Tooltip.Provider (для тултипов ставки/глоссария) + FunnelProvider + page_loaded.
// submitApplication пробрасывается сверху — точка стыковки с треком D
// (по умолчанию мок). Здесь же — событие page_loaded при монтировании.
// =====================================================

import { useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { FunnelProvider, type SubmitApplication } from './funnel-context';
import { Funnel } from './funnel';
import { track } from '@/lib/analytics';

function PageLoaded() {
  useEffect(() => {
    track('page_loaded', {
      url: typeof window !== 'undefined' ? window.location.pathname : '',
    });
  }, []);
  return null;
}

export function FunnelRoot({ submitApplication }: { submitApplication?: SubmitApplication }) {
  return (
    <Tooltip.Provider delayDuration={120} skipDelayDuration={300}>
      <FunnelProvider submitApplication={submitApplication}>
        <PageLoaded />
        <Funnel />
      </FunnelProvider>
    </Tooltip.Provider>
  );
}
