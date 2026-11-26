import Image from "next/image";
import { cn } from "@/lib/utils";
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "w-[220px] max-w-full min-w-0",
        dark && "rounded-xl bg-white p-2 shadow-sm",
      )}
    >
      <Image
        src="/colegio/iberacad_logo.svg"
        alt="IberAcad — Sistema de Gestión Académica"
        width={900}
        height={300}
        unoptimized
        loading="eager"
        className="block h-auto w-full"
      />
    </div>
  );
}
