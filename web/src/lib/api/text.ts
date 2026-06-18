// =====================================================
// ===== D1/D2: текстовые помощники (телефон/ИИН/ФИО) ===
// Перенос logiки onlyDigits/formatPhone/splitFio/maskPhone/initials из легаси
// (index.html + __auth-integration.js). Маска телефона — без жёсткой валидации.
// =====================================================

/** Оставить только цифры. */
export function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/**
 * Маска телефона +7 (___) ___-__-__ по мере ввода (как formatPhone в легаси).
 * Принимает любые цифры (до 11), не валидирует жёстко.
 */
export function formatPhone(input: string): string {
  let d = onlyDigits(input).slice(0, 11);
  if (!d) return "";
  // Нормализуем ведущую 8 → 7 (казахстанский формат).
  if (d[0] === "8") d = "7" + d.slice(1);
  if (d[0] !== "7") d = "7" + d;
  d = d.slice(0, 11);
  const p = d.slice(1); // часть после 7
  let out = "+7";
  if (p.length > 0) out += " (" + p.slice(0, 3);
  if (p.length >= 3) out += ")";
  if (p.length > 3) out += " " + p.slice(3, 6);
  if (p.length > 6) out += "-" + p.slice(6, 8);
  if (p.length > 8) out += "-" + p.slice(8, 10);
  return out;
}

/** Скрытая маска привязанного номера: +7 (XXX) •••-••-NN. */
export function maskPhone(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length !== 11) return "";
  return "+7 (" + d.slice(1, 4) + ") •••-••-" + d.slice(-2);
}

/**
 * Маска ИИН: видны первые 4 и последние 2 цифры, середина — точки.
 * Пример: 010640000111 → 0106••••••11. Короткие/нечисловые значения
 * возвращаются как есть (нечего маскировать).
 */
export function maskIin(iin: string): string {
  const d = onlyDigits(iin);
  if (d.length < 7) return iin || "";
  return d.slice(0, 4) + "•".repeat(d.length - 6) + d.slice(-2);
}

/** Разбор строки ФИО → {lastName, firstName, middleName}. */
export function splitFio(fio: string): {
  lastName: string;
  firstName: string;
  middleName: string;
} {
  const p = String(fio || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    lastName: p[0] || "",
    firstName: p[1] || "",
    middleName: p.slice(2).join(" ") || "",
  };
}

/** Инициалы (Фамилия Имя → «ФИ»). */
export function initials(name: string): string {
  const p = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((p[0] || "?")[0] + (p[1] ? p[1][0] : "")).toUpperCase();
}

/** Первое слово имени (для чипа в шапке). */
export function firstWord(name: string): string {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || ""
  );
}
