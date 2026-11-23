"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/fr";
import { dialCodes } from "@/lib/phone";
import { addDaysIso, formatDate, nightsBetween, todayIso } from "@/lib/dates";
import { reservationFormToObject, reservationRequestSchema, fieldErrors as zodFieldErrors } from "@/lib/validation/reservation";
import { submitReservation, type ReservationFormState } from "@/app/(site)/[lang]/reservations/actions";

type SuiteOption = { slug: string; name: string; collection: "standard" | "legend" };

const STEP1 = ["checkIn", "checkOut", "guests", "rooms", "preferredCategory"];

export function ReservationForm({
  locale,
  t,
  suites,
  categoryLabels,
  privacyHref,
  homeHref,
}: {
  locale: Locale;
  t: Dictionary["reservation"];
  suites: SuiteOption[];
  categoryLabels: Record<string, string>;
  privacyHref: string;
  homeHref: string;
}) {
  const params = useSearchParams();
  const initialSuite = params.get("suite");
  const reduced = useReducedMotion();
  const [state, action, pending] = useActionState<ReservationFormState, FormData>(submitReservation, { status: "idle" });
  const [step, setStep] = useState<1 | 2>(1);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const today = todayIso();
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDaysIso(today, 3));
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const serverErrors = state.status === "error" ? state.fieldErrors : {};
  const errors = { ...serverErrors, ...clientErrors };
  const nights = nightsBetween(checkIn, checkOut);
  const defaultCategory = initialSuite && suites.some((s) => s.slug === initialSuite) ? `suite:${initialSuite}` : "any";

  // Server errors on step-1 fields → go back to step 1 (adjusted during render, not in an effect).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.status === "error" && Object.keys(state.fieldErrors).some((k) => STEP1.includes(k))) setStep(1);
  }

  useEffect(() => {
    if (state.status === "error") errorSummaryRef.current?.focus();
    if (state.status === "success") {
      resultRef.current?.focus();
      window.__lenis?.scrollTo(0, { immediate: true });
    }
  }, [state]);

  const errorText = (key?: string) => (key ? ((t.errors as Record<string, string>)[key] ?? t.errors.generic) : undefined);

  const validate = (fields?: string[]): Record<string, string> => {
    if (!formRef.current) return {};
    const parsed = reservationRequestSchema().safeParse(reservationFormToObject(new FormData(formRef.current)));
    const errs = parsed.success ? {} : zodFieldErrors(parsed.error);
    const scoped = fields ? Object.fromEntries(Object.entries(errs).filter(([k]) => fields.includes(k))) : errs;
    setClientErrors(scoped);
    return scoped;
  };

  const categoryOptions = useMemo(
    () => [
      { value: "any", label: categoryLabels.any },
      { value: "standard", label: categoryLabels.standard },
      { value: "legend", label: categoryLabels.legend },
      ...suites.map((s) => ({ value: `suite:${s.slug}`, label: s.name })),
    ],
    [suites, categoryLabels],
  );

  if (state.status === "success") {
    const s = state.summary;
    const cat = categoryOptions.find((o) => o.value === s.preferredCategory)?.label ?? s.preferredCategory;
    return (
      <motion.div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        className="outline-none"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ornament inline-block text-champagne" aria-hidden="true" />
        <h2 className="display display-lg mt-6">{t.successTitle}</h2>
        <p className="lede mt-6 max-w-xl text-stone">{t.successText}</p>
        <div className="mt-12 border border-charcoal/15 p-8 md:p-10">
          <p className="eyebrow text-stone">{t.reference}</p>
          <p className="mt-3 font-sans text-3xl font-medium tracking-[0.12em] tabular-nums md:text-4xl" dir="ltr">{state.reference}</p>
          <p className="mt-4 text-sm text-stone">{t.keepReference}</p>
          <p className="mt-6 border-s-2 border-champagne ps-4 text-sm">{t.successPending}</p>
          <h3 className="eyebrow mt-10 text-stone">{t.summary}</h3>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-stone">{t.checkIn}</dt><dd>{formatDate(s.checkIn, locale)}</dd></div>
            <div><dt className="text-stone">{t.checkOut}</dt><dd>{formatDate(s.checkOut, locale)}</dd></div>
            <div><dt className="text-stone">{t.guests}</dt><dd>{s.guests}</dd></div>
            <div><dt className="text-stone">{t.rooms}</dt><dd>{s.rooms}</dd></div>
            <div><dt className="text-stone">{t.category}</dt><dd>{cat}</dd></div>
            {s.email && <div><dt className="text-stone">{t.email}</dt><dd>{s.email}</dd></div>}
          </dl>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href={homeHref} className="btn btn-dark">La Badira</Link>
          <button type="button" className="btn btn-dark" onClick={() => window.location.reload()}>{t.newRequest}</button>
        </div>
      </motion.div>
    );
  }

  const field = (name: string) => ({
    name,
    id: `f-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `e-${name}` : undefined,
  });
  const err = (name: string) =>
    errors[name] ? (
      <p id={`e-${name}`} className="mt-2 text-xs text-[#9b2c2c]">{errorText(errors[name])}</p>
    ) : null;

  const formError = state.status === "error" ? state.formError : undefined;

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onSubmit={(e) => {
        const errs = validate();
        if (Object.keys(errs).length) {
          e.preventDefault();
          if (Object.keys(errs).some((k) => STEP1.includes(k))) setStep(1);
        }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from humans and assistive tech */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <ol className="mb-12 flex gap-8 text-[0.7rem] tracking-[0.25em] uppercase rtl:tracking-normal" aria-label="Steps">
        {[t.stepStay, t.stepGuest].map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? "step" : undefined} className={`flex items-center gap-3 ${step === i + 1 ? "text-charcoal" : "text-stone/60"}`}>
            <span className={`flex h-7 w-7 items-center justify-center border text-[0.65rem] ${step === i + 1 ? "border-charcoal" : "border-stone/30"}`}>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {formError && (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="mb-10 border-s-2 border-[#9b2c2c] bg-white/60 px-5 py-4 text-sm outline-none">
          {errorText(formError)}
        </div>
      )}

      {/* Both steps stay in the DOM so every field is submitted; the hidden step is inert. */}
      <fieldset className={step === 1 ? "block" : "hidden"} inert={step !== 1}>
        <legend className="sr-only">{t.stepStay}</legend>
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
          <div>
            <label htmlFor="f-checkIn" className="field-label">{t.checkIn}</label>
            <input
              {...field("checkIn")}
              type="date"
              required
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (e.target.value >= checkOut) setCheckOut(addDaysIso(e.target.value, 1));
              }}
              className="field"
            />
            {err("checkIn")}
          </div>
          <div>
            <label htmlFor="f-checkOut" className="field-label">{t.checkOut}</label>
            <input {...field("checkOut")} type="date" required min={addDaysIso(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="field" />
            {err("checkOut")}
          </div>
          <p className="text-sm text-stone md:col-span-2" aria-live="polite">
            {nights > 0 ? `${nights} ${nights > 1 ? t.nights : t.night}` : ""}
          </p>
          <div>
            <label htmlFor="f-guests" className="field-label">{t.guests}</label>
            <input {...field("guests")} type="number" inputMode="numeric" min={1} max={20} defaultValue={2} required className="field" />
            <p className="mt-2 text-xs text-stone">{t.adultsOnlyHint}</p>
            {err("guests")}
          </div>
          <div>
            <label htmlFor="f-rooms" className="field-label">{t.rooms}</label>
            <input {...field("rooms")} type="number" inputMode="numeric" min={1} max={10} defaultValue={1} required className="field" />
            {err("rooms")}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="f-preferredCategory" className="field-label">{t.category}</label>
            <select {...field("preferredCategory")} defaultValue={defaultCategory} className="field">
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {err("preferredCategory")}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-solid mt-14"
          onClick={() => {
            if (Object.keys(validate(STEP1)).length === 0) {
              setStep(2);
              setTimeout(() => document.getElementById("f-firstName")?.focus(), 50);
            }
          }}
        >
          {t.continue} →
        </button>
      </fieldset>

      <fieldset className={step === 2 ? "block" : "hidden"} inert={step !== 2}>
        <legend className="sr-only">{t.stepGuest}</legend>
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
          <div>
            <label htmlFor="f-firstName" className="field-label">{t.firstName}</label>
            <input {...field("firstName")} autoComplete="given-name" required maxLength={80} className="field" />
            {err("firstName")}
          </div>
          <div>
            <label htmlFor="f-lastName" className="field-label">{t.lastName}</label>
            <input {...field("lastName")} autoComplete="family-name" required maxLength={80} className="field" />
            {err("lastName")}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="f-email" className="field-label">{t.email}</label>
            <input {...field("email")} type="email" autoComplete="email" maxLength={254} className="field" dir="ltr" />
            {err("email")}
          </div>
          <div className="grid grid-cols-[minmax(7rem,9rem)_1fr] gap-6 md:col-span-2">
            <div>
              <label htmlFor="f-dialCode" className="field-label">{t.dialCode}</label>
              <select {...field("dialCode")} defaultValue={locale === "fr" ? "+33" : locale === "ar" ? "+216" : "+44"} className="field" autoComplete="tel-country-code" dir="ltr">
                {dialCodes.map((d) => (
                  <option key={d.iso} value={d.code}>{`${d.code} ${d.iso}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-phone" className="field-label">{t.phone}</label>
              <input {...field("phone")} type="tel" autoComplete="tel-national" required maxLength={25} className="field" dir="ltr" />
              {err("phone")}
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="f-specialRequests" className="field-label">{t.specialRequests}</label>
            <textarea {...field("specialRequests")} rows={4} maxLength={2000} placeholder={t.specialRequestsHint} className="field resize-y" />
            {err("specialRequests")}
          </div>
          <div className="md:col-span-2">
            <label className="flex items-start gap-4 text-sm">
              <input {...field("consent")} type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-charcoal" />
              <span>
                {t.consent}{" "}
                <Link href={privacyHref} target="_blank" className="underline underline-offset-4">{t.privacyLink}</Link>
              </span>
            </label>
            {err("consent")}
          </div>
        </div>
        <p className="mt-10 border-s-2 border-champagne ps-4 text-sm text-stone">{t.notice}</p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <button type="button" className="link-draw text-xs tracking-[0.25em] uppercase rtl:tracking-normal" onClick={() => setStep(1)}>
            ← {t.stepStay}
          </button>
          <button type="submit" className="btn btn-solid" disabled={pending} aria-busy={pending}>
            {pending ? t.submitting : t.submit}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
