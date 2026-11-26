"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 p-8">
      <h1 className="text-2xl font-semibold">
        No pudimos cargar la información
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Intenta de nuevo. Si el problema continúa, revisa la conexión y la
        instalación de la base con el administrador.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <Button asChild variant="outline">
          <Link href="/login">Inicio de sesión</Link>
        </Button>
      </div>
    </main>
  );
}
