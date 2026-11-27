import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireProfile: m.auth }));
import { loadManagement } from "./management";
function request() {
  const r: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const key of [
    "select",
    "order",
    "range",
    "or",
    "eq",
    "filter",
    "ilike",
    "in",
  ])
    r[key] = vi.fn().mockImplementation(() => r);
  r.then = vi
    .fn()
    .mockImplementation((resolve) =>
      Promise.resolve({ data: [], count: 0, error: null }).then(resolve),
    );
  return r;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({
    profile: { rol: "DIRECTOR" },
    supabase: { from: m.from },
  });
});
describe("consultas de gestión", () => {
  it("filtra RUDE y estado antes de obtener una página", async () => {
    const r = request();
    m.from.mockReturnValue(r);
    await loadManagement("estudiantes", "DEMO-12", 2, {
      campo: "rude",
      estado: "activo",
    });
    expect(r.ilike).toHaveBeenCalledWith("rude", "%DEMO-12%");
    expect(r.eq).toHaveBeenCalledWith("activo", true);
    expect(r.range).toHaveBeenCalledWith(25, 49);
  });
  it("busca cada palabra del nombre completo y permite CI o teléfono", async () => {
    const r = request();
    m.from.mockReturnValue(r);
    await loadManagement("estudiantes", "Ana Perez", 1);
    expect(r.or).toHaveBeenCalledTimes(2);
    expect(r.or.mock.calls[0][0]).toContain("ci.ilike.%Ana%");
    expect(r.or.mock.calls[1][0]).toContain("apellido_paterno.ilike.%Perez%");
  });
  it("combina gestión, grado y estado para cursos", async () => {
    const r = request();
    m.from.mockReturnValue(r);
    await loadManagement("cursos", "A", 1, {
      gestion: "gestion",
      grado: "3",
      estado: "inactivo",
    });
    expect(r.eq).toHaveBeenCalledWith("gestion_id", "gestion");
    expect(r.eq).toHaveBeenCalledWith("grado_id", 3);
    expect(r.eq).toHaveBeenCalledWith("activo", false);
  });
  it("mantiene la restricción de acceso a fichas administrativas", async () => {
    m.auth.mockResolvedValue({
      profile: { rol: "ESTUDIANTE" },
      supabase: { from: m.from },
    });
    expect(await loadManagement("estudiantes", "", 1)).toBeNull();
    expect(m.from).not.toHaveBeenCalled();
  });
});
