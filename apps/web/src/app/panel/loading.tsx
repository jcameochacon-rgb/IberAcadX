export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-10" aria-live="polite">
      <p className="text-sm text-muted-foreground">
        Cargando tu información académica…
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
