"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, RotateCw } from "lucide-react";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export function Captcha({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [message, setMessage] = useState("Preparando verificación…");
  const [failed, setFailed] = useState(false);
  const [verified, setVerified] = useState(false);
  const invalidate = useCallback(
    (message: string) => {
      onToken("");
      setVerified(false);
      setMessage(message);
      setFailed(true);
    },
    [onToken],
  );
  const render = useCallback(() => {
    if (!container.current || !window.turnstile || widget.current !== undefined)
      return;
    try {
      widget.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "light",
        size: container.current.clientWidth < 300 ? "compact" : "flexible",
        language: "es",
        "response-field": false,
        callback: (token: string) => {
          onToken(token);
          setVerified(true);
          setFailed(false);
          setMessage("Verificación completada.");
        },
        "expired-callback": () =>
          invalidate("La verificación venció. Vuelve a verificarte."),
        "timeout-callback": () =>
          invalidate("La verificación tardó demasiado. Intenta de nuevo."),
        "error-callback": () => {
          invalidate(
            "No se pudo verificar. Revisa tu conexión e inténtalo de nuevo.",
          );
          return true;
        },
      });
    } catch {
      invalidate("No se pudo cargar la verificación. Recarga la página.");
    }
  }, [siteKey, onToken, invalidate]);
  useEffect(
    () => () => {
      if (widget.current !== undefined)
        window.turnstile?.remove(widget.current);
      widget.current = undefined;
    },
    [],
  );
  useEffect(() => {
    if (verified || failed) return;
    const timer = setTimeout(
      () =>
        invalidate(
          "La verificación no responde. Revisa tu conexión o recarga la página.",
        ),
      30000,
    );
    return () => clearTimeout(timer);
  }, [verified, failed, invalidate]);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <ShieldCheck
          size={18}
          className={verified ? "text-emerald-600" : "text-blue-700"}
          aria-hidden="true"
        />
        Verificación de seguridad
      </div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
        onError={() =>
          invalidate(
            "No se pudo cargar el CAPTCHA. Revisa tu conexión o recarga la página.",
          )
        }
      />
      <div ref={container} className="min-h-[65px]" />
      <p
        role="status"
        className={`mt-2 text-xs leading-5 ${failed ? "text-red-700" : "text-slate-500"}`}
      >
        {message}
      </p>
      {failed && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-800 underline"
          onClick={() => {
            if (widget.current === undefined) {
              window.location.reload();
              return;
            }
            onToken("");
            setVerified(false);
            setFailed(false);
            setMessage("Preparando verificación…");
            window.turnstile?.reset(widget.current);
          }}
        >
          <RotateCw size={13} />
          Reintentar verificación
        </button>
      )}
    </div>
  );
}
