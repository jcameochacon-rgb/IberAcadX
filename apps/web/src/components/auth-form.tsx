"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";
import { login, recoverPassword, updatePassword } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emptyFormState } from "@/lib/auth-validation";
import { Captcha } from "@/components/captcha";
export function AuthForm({
  mode,
  configured = true,
}: {
  mode: "login" | "recover" | "update";
  configured?: boolean;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const needsCaptcha = mode !== "update" && !!siteKey;
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: typeof emptyFormState, form: FormData) => {
      try {
        return await (
          mode === "login"
            ? login
            : mode === "recover"
              ? recoverPassword
              : updatePassword
        )(previous, form);
      } finally {
        setCaptchaToken("");
        setCaptchaAttempt((attempt) => attempt + 1);
      }
    },
    emptyFormState,
  );
  const [show, setShow] = useState(false);
  return (
    <form
      action={action}
      className={
        mode === "login" ? "login-auth-form mt-5 space-y-4" : "mt-8 space-y-5"
      }
    >
      {mode !== "update" && (
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Correo electrónico
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu.correo@ejemplo.com"
            required
            maxLength={254}
            disabled={pending}
          />
        </div>
      )}
      {mode !== "recover" && (
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            {mode === "update" ? "Nueva contraseña" : "Contraseña"}
          </label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "update" ? 12 : 1}
              maxLength={mode === "update" ? 128 : 256}
              className="pr-12"
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1.5 rounded-md p-2 text-muted-foreground hover:text-foreground focus-visible:outline-2"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {mode === "update" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Usa al menos 12 caracteres.
            </p>
          )}
        </div>
      )}
      {mode === "update" && (
        <div>
          <label htmlFor="confirm" className="mb-2 block text-sm font-medium">
            Confirmar contraseña
          </label>
          <Input
            id="confirm"
            name="confirm"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            disabled={pending}
          />
        </div>
      )}
      {needsCaptcha && (
        <>
          <input type="hidden" name="captchaToken" value={captchaToken} />
          <Captcha
            key={captchaAttempt}
            siteKey={siteKey}
            onToken={setCaptchaToken}
          />
        </>
      )}
      {mode !== "update" && !siteKey && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          CAPTCHA pendiente de activación por el administrador.
        </p>
      )}
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {state.success}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !configured || (needsCaptcha && !captchaToken)}
      >
        {pending ? (
          <>
            <LoaderCircle size={17} className="animate-spin" />
            Procesando…
          </>
        ) : (
          <>
            {mode === "login"
              ? "Iniciar sesión"
              : mode === "recover"
                ? "Enviar enlace"
                : "Guardar contraseña"}
            <ArrowRight size={17} />
          </>
        )}
      </Button>
    </form>
  );
}
