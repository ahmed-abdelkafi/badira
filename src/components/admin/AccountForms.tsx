"use client";

import { startTransition, useActionState, useState } from "react";
import { derivePasswordProof, passwordPolicyError } from "@/lib/password";
import { changePasswordAction, regenerateCodesAction, type AccountState } from "@/app/(admin)/admin/(panel)/account/actions";
import { RecoveryCodesDisplay } from "./auth-forms";

function Feedback({ state }: { state: AccountState }) {
  if (state.error) return <p role="alert" className="text-sm text-[#b42318]">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm text-[#1f6f43]">{state.message}</p>;
  return null;
}

export function ChangePasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePasswordAction, {});
  const [localError, setLocalError] = useState<string | null>(null);
  const [deriving, setDeriving] = useState(false);
  const busy = pending || deriving;
  return (
    <form
      method="post"
      className="grid gap-3 md:max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const next = String(f.get("next") ?? "");
        if (next !== String(f.get("confirm") ?? "")) return setLocalError("Les mots de passe ne correspondent pas.");
        const policy = passwordPolicyError(next);
        if (policy) return setLocalError(policy);
        setLocalError(null);
        setDeriving(true);
        const [currentProof, nextProof] = await Promise.all([derivePasswordProof(email, String(f.get("current") ?? "")), derivePasswordProof(email, next)]);
        setDeriving(false);
        const out = new FormData();
        out.set("currentProof", currentProof);
        out.set("nextProof", nextProof);
        startTransition(() => action(out));
        form.reset();
      }}
    >
      <div>
        <label className="a-label" htmlFor="current">Mot de passe actuel</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="a-input" />
      </div>
      <div>
        <label className="a-label" htmlFor="next">Nouveau mot de passe</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={12} required className="a-input" />
      </div>
      <div>
        <label className="a-label" htmlFor="confirm">Confirmer</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required className="a-input" />
      </div>
      <Feedback state={localError ? { error: localError } : state} />
      <button className="a-btn a-btn-primary w-fit" disabled={busy}>{busy ? "Enregistrement…" : "Modifier le mot de passe"}</button>
    </form>
  );
}

export function RegenerateCodesForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(regenerateCodesAction, {});
  if (state.ok && state.codes) return <RecoveryCodesDisplay codes={state.codes} />;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="a-label" htmlFor="stepup">Code de l’application (confirmation)</label>
        <input id="stepup" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className="a-input w-40 font-mono" />
      </div>
      <button className="a-btn" disabled={pending}>Générer de nouveaux codes</button>
      <div className="w-full"><Feedback state={state} /></div>
    </form>
  );
}
