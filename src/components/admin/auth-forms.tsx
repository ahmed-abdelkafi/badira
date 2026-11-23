"use client";

import { startTransition, useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  confirmSetupAction,
  finishEnrolmentAction,
  loginAction,
  resetPasswordAction,
  verifyTwoFactorAction,
  type FormState,
} from "@/app/(admin)/admin/login/actions";
import { derivePasswordProof, passwordPolicyError } from "@/lib/password";

/** False during SSR / before hydration: forms stay disabled so a native submit can never leak a password. */
const noop = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function ErrorBox({ state }: { state: FormState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mb-4 rounded border border-[#f2c7c2] bg-[#fdf1ef] px-3 py-2 text-sm text-[#b42318]">
      {state.error}
    </p>
  );
}

/**
 * The password is turned into a PBKDF2 proof in the browser (≈0.5 s); only
 * the proof is sent. See src/lib/password.ts.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  const [deriving, setDeriving] = useState(false);
  const hydrated = useHydrated();
  const busy = pending || deriving || !hydrated;
  return (
    <form
      method="post"
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setDeriving(true);
        const proof = await derivePasswordProof(String(f.get("email") ?? ""), String(f.get("password") ?? ""));
        setDeriving(false);
        const out = new FormData();
        out.set("email", String(f.get("email") ?? ""));
        out.set("proof", proof);
        out.set("next", next ?? "");
        startTransition(() => action(out));
      }}
    >
      <ErrorBox state={state} />
      <div>
        <label className="a-label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="a-input" />
      </div>
      <div>
        <label className="a-label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="a-input" />
      </div>
      <button className="a-btn a-btn-primary w-full" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      <p className="text-center text-xs">
        <Link href="/admin/reset-password" className="text-stone underline underline-offset-4">Mot de passe oublié ?</Link>
      </p>
    </form>
  );
}

export function VerifyForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(verifyTwoFactorAction, {});
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="a-label" htmlFor="code">{recovery ? "Code de récupération" : "Code à 6 chiffres"}</label>
        <input
          key={String(recovery)}
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode={recovery ? "text" : "numeric"}
          maxLength={recovery ? 11 : 7}
          placeholder={recovery ? "xxxxx-xxxxx" : "123 456"}
          className="a-input text-center font-mono text-lg tracking-[0.3em]"
        />
      </div>
      <button className="a-btn a-btn-primary w-full" disabled={pending}>{pending ? "Vérification…" : "Vérifier"}</button>
      <button type="button" className="w-full text-center text-xs text-stone underline underline-offset-4" onClick={() => setRecovery((v) => !v)}>
        {recovery ? "Utiliser l’application d’authentification" : "Utiliser un code de récupération"}
      </button>
    </form>
  );
}

export function RecoveryCodesDisplay({ codes, onContinue }: { codes: string[]; onContinue?: () => Promise<void> }) {
  const [saved, setSaved] = useState(false);
  const text = codes.join("\n");
  return (
    <div className="space-y-4">
      <div className="rounded border border-[#e6d9bf] bg-[#fbf6ea] p-4 text-sm">
        <p className="font-medium">Codes de récupération — affichés une seule fois</p>
        <p className="mt-1 text-stone">
          Conservez-les dans un gestionnaire de mots de passe. Chaque code n’est utilisable qu’une fois, si vous perdez l’accès à votre téléphone.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 rounded border border-[#e8e3d9] bg-white p-4 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button type="button" className="a-btn a-btn-sm" onClick={() => navigator.clipboard.writeText(text)}>Copier</button>
        <button
          type="button"
          className="a-btn a-btn-sm"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text + "\n"], { type: "text/plain" }));
            const a = Object.assign(document.createElement("a"), { href: url, download: "la-badira-recovery-codes.txt" });
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Télécharger (.txt)
        </button>
      </div>
      {onContinue && (
        <form action={onContinue} className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> J’ai conservé mes codes en lieu sûr
          </label>
          <button className="a-btn a-btn-primary w-full" disabled={!saved}>Accéder au tableau de bord</button>
        </form>
      )}
    </div>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(confirmSetupAction, {});
  if (state.ok && state.codes) return <RecoveryCodesDisplay codes={state.codes} onContinue={finishEnrolmentAction} />;
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <div>
        <label className="a-label" htmlFor="code">Code affiché dans l’application</label>
        <input id="code" name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456" className="a-input text-center font-mono text-lg tracking-[0.3em]" />
      </div>
      <button className="a-btn a-btn-primary w-full" disabled={pending}>{pending ? "Vérification…" : "Activer la double authentification"}</button>
    </form>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  const [localError, setLocalError] = useState<string | null>(null);
  const [deriving, setDeriving] = useState(false);
  const hydrated = useHydrated();
  if (state.ok)
    return (
      <div className="space-y-4">
        <p role="status" className="rounded border border-[#cfe6d8] bg-[#eff8f2] p-4 text-sm">{state.message}</p>
        <Link href="/admin/login" className="a-btn a-btn-primary w-full">Se connecter</Link>
      </div>
    );
  const busy = pending || deriving || !hydrated;
  return (
    <form
      method="post"
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const password = String(f.get("password") ?? "");
        if (password !== String(f.get("confirm") ?? "")) return setLocalError("Les mots de passe ne correspondent pas.");
        const policy = passwordPolicyError(password);
        if (policy) return setLocalError(policy);
        setLocalError(null);
        setDeriving(true);
        const proof = await derivePasswordProof(email, password);
        setDeriving(false);
        const out = new FormData();
        out.set("token", token);
        out.set("proof", proof);
        startTransition(() => action(out));
      }}
    >
      <ErrorBox state={localError ? { error: localError } : state} />
      <p className="text-sm text-stone">Compte : <strong className="text-charcoal">{email}</strong></p>
      <div>
        <label className="a-label" htmlFor="password">Nouveau mot de passe</label>
        <input id="password" name="password" type="password" minLength={12} required autoComplete="new-password" className="a-input" />
        <p className="mt-1 text-xs text-stone">12 caractères minimum, avec au moins 3 types : minuscules, majuscules, chiffres, symboles.</p>
      </div>
      <div>
        <label className="a-label" htmlFor="confirm">Confirmer</label>
        <input id="confirm" name="confirm" type="password" minLength={12} required autoComplete="new-password" className="a-input" />
      </div>
      <button className="a-btn a-btn-primary w-full" disabled={busy}>{busy ? "Enregistrement…" : "Mettre à jour"}</button>
    </form>
  );
}
