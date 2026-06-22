"use client";

// =====================================================
// ===== D2/D5: модалка авторизации ====================
// Экраны: login (ИИН → OTP), register (ФИО+ИИН+тел → OTP), SSO (eGov/Baiterek).
// SMS-флоу перенесён из __auth-integration.js (attachLogin/attachRegister/renderOtpStep).
// Demo: если бэкенд вернул demoCode — подставляем его в ячейки автоматически.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import {
  checkBmgAndSendSmsForRegister,
  errText,
  formatPhone,
  maskPhone,
  onlyDigits,
  profileFromTokens,
  requestSms,
  smsRegister,
  verifySmsCode,
  type SmsPurpose,
} from "@/lib/api";
import { useAuth, type AuthView } from "./auth-provider";
import { OtpInput } from "./otp-input";

/** Контекст текущего флоу OTP. */
interface OtpCtx {
  mode: "login" | "register";
  iin: string;
  phone: string; // +7XXXXXXXXXX для регистрации, '' для логина
  maskedPhone?: string; // маскированный номер «из базы» для логина (с бэка)
  demoCode?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
}

type Step = "form" | "otp";

export function AuthModal() {
  const t = useTranslations("cabinet");
  const { authView, openAuth, closeAuth, completeLogin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ESC закрывает; блокируем скролл body, пока открыто.
  useEffect(() => {
    if (!authView) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAuth();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [authView, closeAuth]);

  if (!mounted || !authView) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuth();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(authView === "register" ? "auth.registerHead" : "auth.loginHead")}
        className="relative w-full max-w-[440px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-7"
      >
        <button
          type="button"
          onClick={closeAuth}
          aria-label={t("auth.close")}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)] hover:bg-[var(--bg-tint)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <AuthBody
          view={authView}
          switchView={openAuth}
          onAuthorized={completeLogin}
        />
      </div>
    </div>,
    document.body,
  );
}

// --- Тело модалки (form / otp) -------------------------------------------

function AuthBody({
  view,
  switchView,
  onAuthorized,
}: {
  view: AuthView;
  switchView: (v: AuthView) => void;
  onAuthorized: ReturnType<typeof useAuth>["completeLogin"];
}) {
  const t = useTranslations("cabinet");
  const [step, setStep] = useState<Step>("form");
  const [ctx, setCtx] = useState<OtpCtx | null>(null);

  // Сброс на форму при переключении login/register.
  useEffect(() => {
    setStep("form");
    setCtx(null);
  }, [view]);

  if (step === "otp" && ctx) {
    return (
      <OtpStep
        ctx={ctx}
        onBack={() => setStep("form")}
        onResend={setCtx}
        onAuthorized={onAuthorized}
        t={t}
      />
    );
  }

  return view === "register" ? (
    <RegisterForm
      switchView={switchView}
      onSent={(c) => {
        setCtx(c);
        setStep("otp");
      }}
      t={t}
    />
  ) : (
    <LoginForm
      onSent={(c) => {
        setCtx(c);
        setStep("otp");
      }}
      t={t}
    />
  );
}

type TFn = ReturnType<typeof useTranslations>;

// --- Вход по ИИН ---------------------------------------------------------

function LoginForm({
  onSent,
  t,
}: {
  onSent: (ctx: OtpCtx) => void;
  t: TFn;
}) {
  const [iin, setIin] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    if (iin.length !== 12) {
      setErr(t("auth.errIin"));
      return;
    }
    if (!consent) {
      setErr(t("auth.consentRequired"));
      return;
    }
    setBusy(true);
    const r = await requestSms(iin);
    setBusy(false);
    if (r.unavailable) {
      setErr(t("auth.errUnavailable"));
      return;
    }
    if (r.status === 404) {
      setErr(t("auth.errNotFound"));
      return;
    }
    if (!r.ok) {
      setErr(errText(r, t("auth.errSms")));
      return;
    }
    // maskedPhone — «подтянутый из базы» номер, фронт покажет его на шаге кода.
    onSent({ mode: "login", iin, phone: "", maskedPhone: r.data?.phone, demoCode: r.data?.demoCode });
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("auth.loginHead")}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-3)]">{t("auth.loginSub")}</p>
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">
          {t("auth.iinLabel")}
        </label>
        <input
          inputMode="numeric"
          value={iin}
          onChange={(e) => setIin(onlyDigits(e.target.value).slice(0, 12))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="XXXXXXXXXXXX"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text)] tracking-wider focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
      </div>

      {/* Согласие на обработку персональных данных — обязательно перед отправкой кода */}
      <label className="mt-4 flex cursor-pointer select-none items-start gap-2.5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
        <span className="text-xs leading-snug text-[var(--text-2)]">{t("auth.consentLabel")}</span>
      </label>

      {err && <p className="mt-2 text-sm text-[var(--danger)]">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !consent || iin.length !== 12}
        className="mt-4 w-full rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2,#247035)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {busy ? t("auth.sending") : t("auth.getCode")}
      </button>
    </div>
  );
}

// --- Регистрация ---------------------------------------------------------

function RegisterForm({
  switchView,
  onSent,
  t,
}: {
  switchView: (v: AuthView) => void;
  onSent: (ctx: OtpCtx) => void;
  t: TFn;
}) {
  const [last, setLast] = useState("");
  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [iin, setIin] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    if (!last.trim() || !first.trim()) {
      setErr(t("auth.errName"));
      return;
    }
    if (iin.length !== 12) {
      setErr(t("auth.errIin"));
      return;
    }
    const phoneDigits = onlyDigits(phone);
    if (phoneDigits.length !== 11) {
      setErr(t("auth.errPhone"));
      return;
    }
    const phoneNorm = "+" + phoneDigits;
    setBusy(true);
    const r = await checkBmgAndSendSmsForRegister(iin, phoneNorm);
    setBusy(false);
    if (r.unavailable) {
      setErr(t("auth.errUnavailable"));
      return;
    }
    if (!r.ok) {
      setErr(errText(r, t("auth.errSms")));
      return;
    }
    onSent({
      mode: "register",
      iin,
      phone: phoneNorm,
      demoCode: r.data?.demoCode,
      lastName: last.trim(),
      firstName: first.trim(),
      middleName: middle.trim(),
    });
  }

  const inputCls =
    "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[15px] text-[var(--text)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]";

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("auth.registerHead")}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-3)]">{t("auth.registerSub")}</p>
      <div className="mt-4 flex flex-col gap-3">
        <input className={inputCls} placeholder={t("auth.lastName")} value={last} onChange={(e) => setLast(e.target.value)} />
        <input className={inputCls} placeholder={t("auth.firstName")} value={first} onChange={(e) => setFirst(e.target.value)} />
        <input className={inputCls} placeholder={t("auth.middleName")} value={middle} onChange={(e) => setMiddle(e.target.value)} />
        <input className={inputCls} inputMode="numeric" placeholder={t("auth.iinLabel")} value={iin} onChange={(e) => setIin(onlyDigits(e.target.value).slice(0, 12))} />
        <input className={inputCls} inputMode="tel" placeholder="+7 (___) ___-__-__" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
      </div>
      {err && <p className="mt-2 text-sm text-[var(--danger)]">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-5 w-full rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2,#247035)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {busy ? t("auth.sending") : t("auth.register")}
      </button>
      <p className="mt-3 text-center text-sm text-[var(--text-3)]">
        {t("auth.haveAccount")}{" "}
        <button
          type="button"
          onClick={() => switchView("login")}
          className="font-semibold text-[var(--primary)] hover:underline"
        >
          {t("auth.toLogin")}
        </button>
      </p>
    </div>
  );
}

// --- Шаг OTP -------------------------------------------------------------

function OtpStep({
  ctx,
  onBack,
  onResend,
  onAuthorized,
  t,
}: {
  ctx: OtpCtx;
  onBack: () => void;
  onResend: (ctx: OtpCtx) => void;
  onAuthorized: ReturnType<typeof useAuth>["completeLogin"];
  t: TFn;
}) {
  const demo = ctx.demoCode && /^\d{6}$/.test(ctx.demoCode) ? ctx.demoCode : "";
  const [code, setCode] = useState(demo);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCode(demo);
  }, [demo]);

  // Таймер повторной отправки.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setLeft((l) => (l > 0 ? l - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ctx]);

  async function confirm() {
    setErr("");
    if (code.length !== 6) {
      setErr(t("auth.errCodeLen"));
      return;
    }
    setBusy(true);
    const purpose: SmsPurpose = ctx.mode === "login" ? "login" : "registration";
    const r = await verifySmsCode(ctx.iin, code, purpose);
    if (r.unavailable) {
      setBusy(false);
      setErr(t("auth.errUnavailable"));
      return;
    }
    if (!r.ok || !r.data?.verified) {
      setBusy(false);
      const al = r.data?.attemptsLeft;
      const msg = r.data?.message || t("auth.errCode");
      setErr(msg + (al != null ? ` (${t("auth.attemptsLeft")}: ${al})` : "") + ".");
      return;
    }

    if (ctx.mode === "login") {
      const tokens = {
        accessToken: r.data.accessToken,
        refreshToken: r.data.refreshToken,
      };
      const prof = profileFromTokens(tokens, ctx.iin);
      onAuthorized(tokens, {
        name: prof.name,
        iin: ctx.iin,
        phone: prof.phone,
      });
      return;
    }

    // Регистрация: завершаем создание клиента.
    const rr = await smsRegister({
      iin: ctx.iin,
      lastName: ctx.lastName || "",
      firstName: ctx.firstName || "",
      middleName: ctx.middleName || "",
      phoneNumber: ctx.phone,
    });
    setBusy(false);
    if (!rr.ok || !rr.data) {
      setErr(errText(rr, t("auth.errRegister")));
      return;
    }
    const tokens = {
      accessToken: rr.data.accessToken,
      refreshToken: rr.data.refreshToken,
    };
    const fio = `${ctx.lastName || ""} ${ctx.firstName || ""}`.trim();
    onAuthorized(tokens, { name: fio, iin: ctx.iin, phone: ctx.phone });
  }

  async function resend() {
    if (left > 0) return;
    setErr("");
    const r =
      ctx.mode === "login"
        ? await requestSms(ctx.iin)
        : await checkBmgAndSendSmsForRegister(ctx.iin, ctx.phone);
    if (!r.ok) {
      setErr(errText(r, t("auth.errSms")));
      return;
    }
    setLeft(60);
    onResend({ ...ctx, demoCode: r.data?.demoCode });
  }

  const where = ctx.maskedPhone || maskPhone(ctx.phone) || t("auth.linkedNumber");

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("auth.otpHead")}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-3)]">
        {demo
          ? t("auth.otpDemo")
          : t("auth.otpSent", { where })}
      </p>
      <OtpInput value={code} onChange={setCode} aria-label={t("auth.otpHead")} />
      {demo && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft,#f7eecb)] px-3 py-1 text-[11px] font-semibold text-[var(--accent,#b9770a)]">
          {t("auth.demoBadge")}
        </div>
      )}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      <button
        type="button"
        onClick={resend}
        disabled={left > 0}
        className="mt-2 block text-sm font-medium text-[var(--primary)] disabled:opacity-50 hover:underline"
      >
        {left > 0 ? t("auth.resendIn", { sec: left }) : t("auth.resend")}
      </button>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="flex-1 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2,#247035)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {busy ? t("auth.checking") : t("auth.confirm")}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-2)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          {t("auth.back")}
        </button>
      </div>
    </div>
  );
}

