import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireProfile: mocks.requireProfile }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { enrollStudent, assignTeacher } from "./relations-actions";
const ids = [1, 2, 3].map((n) => `00000000-0000-4000-8000-00000000000${n}`);
function form(values: Record<string, string>) {
  const f = new FormData();
  Object.entries(values).forEach(([k, v]) => f.set(k, v));
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireProfile.mockResolvedValue({
    profile: { rol: "SECRETARIA" },
    supabase: { rpc: mocks.rpc, from: mocks.from },
  });
  mocks.rpc.mockResolvedValue({ error: null });
});
describe("vinculación académica desde fichas", () => {
  it("deniega escrituras a docentes antes de consultar datos", async () => {
    mocks.requireProfile.mockResolvedValue({
      profile: { rol: "DOCENTE" },
      supabase: { rpc: mocks.rpc, from: mocks.from },
    });
    expect(await enrollStudent("", form({}))).toContain("Sin permiso");
    expect(await assignTeacher("", form({}))).toContain("Sin permiso");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("matricula mediante el RPC que valida integridad y RLS", async () => {
    expect(
      await enrollStudent(
        "",
        form({ estudiante: ids[0], curso: ids[1], fecha: "2026-02-01" }),
      ),
    ).toContain("correctamente");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "guardar_matricula_academica",
      expect.objectContaining({
        p_estudiante: ids[0],
        p_curso: ids[1],
        p_id: null,
        p_estado: "ACTIVA",
      }),
    );
  });
  it("rechaza fechas inexistentes y matrículas de otra persona", async () => {
    expect(
      await enrollStudent(
        "",
        form({ estudiante: ids[0], curso: ids[1], fecha: "2026-02-30" }),
      ),
    ).toContain("Revisa");
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { estudiante_id: ids[2] }, error: null }),
    };
    mocks.from.mockReturnValue(query);
    expect(
      await enrollStudent(
        "",
        form({
          estudiante: ids[0],
          curso: ids[1],
          matricula: ids[2],
          fecha: "2026-02-01",
        }),
      ),
    ).toContain("no corresponde");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("informa conflicto de versión sin afirmar éxito", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { estudiante_id: ids[0] }, error: null }),
    };
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({
      error: {
        code: "23514",
        message: "Otra persona modificó la ficha. Recarga antes de guardar",
      },
    });
    expect(
      await enrollStudent(
        "",
        form({
          estudiante: ids[0],
          curso: ids[1],
          matricula: ids[2],
          fecha: "2026-02-01",
          version: "2026-01-01T00:00:00Z",
        }),
      ),
    ).toContain("Recarga");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("asigna docente y trata duplicados sin sobrescribir", async () => {
    const f = form({ docente: ids[0], curso: ids[1], asignatura: ids[2] });
    expect(await assignTeacher("", f)).toContain("asignados");
    mocks.rpc.mockResolvedValue({ error: { code: "23505" } });
    expect(await assignTeacher("", f)).toContain("ya tiene un docente");
  });
});
