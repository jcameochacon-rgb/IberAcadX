import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <Link href="/login" className="text-sm font-semibold text-primary">
        Volver al inicio
      </Link>
    </main>
  );
}
