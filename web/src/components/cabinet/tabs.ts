// =====================================================
// ===== D3: вкладки кабинета (общий список) ============
// Используется и боковым меню кабинета, и дропдауном в шапке.
// Ярлыки берутся из cabinet.json (cabinet.nav.*).
// =====================================================

export type CabinetTab = "profile" | "apps" | "docs" | "notif" | "support" | "agroscore";

export interface CabinetTabDef {
  id: CabinetTab;
  /** Ключ перевода в namespace cabinet (без префикса cabinet.). */
  labelKey: string;
}

export const CABINET_TABS: CabinetTabDef[] = [
  { id: "profile", labelKey: "nav.profile" },
  { id: "apps", labelKey: "nav.apps" },
  { id: "docs", labelKey: "nav.docs" },
  { id: "notif", labelKey: "nav.notif" },
  { id: "support", labelKey: "nav.support" },
  { id: "agroscore", labelKey: "nav.agroscore" },
];

/** true → значение является валидной вкладкой кабинета. */
export function isCabinetTab(v: string | null | undefined): v is CabinetTab {
  return (
    v === "profile" ||
    v === "apps" ||
    v === "docs" ||
    v === "notif" ||
    v === "support" ||
    v === "agroscore"
  );
}
