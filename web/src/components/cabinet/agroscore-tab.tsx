"use client";

// =====================================================
// ===== G16: обёртка вкладки АгроСкор =================
// =====================================================

import type { AgroPersona } from "@/data/agroscore-personas";
import { AgroScoreCard } from "./agroscore-card";

interface AgroScoreTabProps {
  persona: AgroPersona | null;
}

export function AgroScoreTab({ persona }: AgroScoreTabProps) {
  if (!persona) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-10 text-center">
        <p className="font-display text-lg font-semibold text-[var(--text)]">
          АгроСкор
        </p>
        <p className="mt-2 text-sm text-[var(--text-3)]">
          АгроСкор появится после идентификации. Войдите под зарегистрированным ИИН.
        </p>
      </div>
    );
  }

  return <AgroScoreCard persona={persona} />;
}
