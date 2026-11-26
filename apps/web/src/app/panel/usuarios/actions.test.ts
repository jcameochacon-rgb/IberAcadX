import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  invite: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireProfile: m.requireProfile }));
vi.mock("@supabase/supabase-js", () => ({ createClient: m.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { accountAction } from "./actions";
const userId = "00000000-0000-4000-8000-000000000001",
  personId = "00000000-0000-4000-8000-000000000002",
  invitedId = "00000000-0000-4000-8000-000000000003";
function form(values: Record<string, string>) {
  const f = new FormData();
  Object.entries(values).forEach(([k, v]) => f.set(k, v));
  return f;
}
function query(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://colegio.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example");
  vi.stubEnv("SUPABASE_SECRET_KEY", "solo-test-no-es-una-clave");
  m.requireProfile.mockResolvedValue({
    profile: { rol: "DIRECTOR" },
    user: { id: userId },
    supabase: { rpc: m.rpc, from: m.from },
  });
  m.createClient.mockReturnValue({
    auth: { admin: { inviteUserByEmail: m.invite, deleteUser: m.deleteUser } },
  });
  m.from.mockReturnValue(query(null));
  m.rpc.mockResolvedValue({ error: null });
  m.invite.mockResolvedValue({
    data: { user: { id: invitedId } },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("invitaciones y control de cuentas", () => {
  it("no envía correo con una URL localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(
      await accountAction(
        "",
        form({ rol: "ESTUDIANTE", email: "test@example.invalid" }),
      ),
    ).toContain("HTTPS");
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("rechaza roles privilegiados solicitados por Secretaría", async () => {
    m.requireProfile.mockResolvedValue({
      profile: { rol: "SECRETARIA" },
      user: { id: userId },
      supabase: { rpc: m.rpc, from: m.from },
    });
    expect(
      await accountAction(
        "",
        form({ rol: "DIRECTOR", email: "test@example.invalid" }),
      ),
    ).toContain("Secretaría solo");
    expect(m.createClient).not.toHaveBeenCalled();
  });
  it("rechaza cuentas duplicadas antes de enviar invitación", async () => {
    m.from.mockReturnValue(query({ id: invitedId }));
    expect(
      await accountAction(
        "",
        form({
          rol: "SECRETARIA",
          persona: personId,
          email: "test@example.invalid",
        }),
      ),
    ).toContain("ya tiene una cuenta");
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("verifica el CI duplicado antes del correo", async () => {
    m.from.mockReturnValue(query({ id: personId }));
    expect(
      await accountAction(
        "",
        form({
          rol: "ESTUDIANTE",
          persona_nueva: "on",
          nombres: "Prueba",
          ci: "TEST",
          email: "test@example.invalid",
        }),
      ),
    ).toContain("CI ya tiene una ficha");
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("invita a la ruta de activación y vincula con el RPC autorizado", async () => {
    const result = await accountAction(
      "",
      form({
        rol: "SECRETARIA",
        persona: personId,
        email: "test@example.invalid",
      }),
    );
    expect(result).not.toContain("No se pudo");
    expect(m.invite).toHaveBeenCalledWith("test@example.invalid", {
      redirectTo: "https://colegio.example/auth/invitacion",
    });
    expect(m.rpc).toHaveBeenCalledWith(
      "administrar_cuenta",
      expect.objectContaining({
        p_id: invitedId,
        p_persona: personId,
        p_rol: "SECRETARIA",
      }),
    );
  });
  it("revierte Auth si el vínculo académico falla", async () => {
    m.rpc.mockResolvedValue({ error: { code: "23514" } });
    m.deleteUser.mockResolvedValue({ error: null });
    expect(
      await accountAction(
        "",
        form({
          rol: "SECRETARIA",
          persona: personId,
          email: "test@example.invalid",
        }),
      ),
    ).toContain("No se pudo vincular");
    expect(m.deleteUser).toHaveBeenCalledWith(invitedId);
  });
});

describe("registro académico sin cuenta", () => {
  const ficha = (extra: Record<string, string> = {}) =>
    form({
      rol: "ESTUDIANTE",
      persona_nueva: "on",
      solo_ficha: "on",
      nombres: "Estudiante de prueba",
      ...extra,
    });
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    m.rpc.mockResolvedValue({ data: invitedId, error: null });
    m.from.mockReturnValue(query({ persona_id: personId }));
  });
  it.each(["DIRECTOR", "SECRETARIA"])(
    "permite a %s registrar sin correo ni clave administrativa",
    async (rol) => {
      m.requireProfile.mockResolvedValue({
        profile: { rol },
        user: { id: userId },
        supabase: { rpc: m.rpc, from: m.from },
      });
      expect(await accountAction("", ficha())).toContain(
        "Ficha registrada correctamente",
      );
      expect(m.rpc).toHaveBeenCalledWith(
        "guardar_ficha_academica",
        expect.objectContaining({
          p_tipo: "estudiantes",
          p_persona: expect.objectContaining({
            nombres: "Estudiante de prueba",
          }),
        }),
      );
      expect(m.createClient).not.toHaveBeenCalled();
      expect(m.invite).not.toHaveBeenCalled();
    },
  );
  it.each(["DOCENTE", "ESTUDIANTE", "PADRE"])(
    "impide a %s crear fichas",
    async (rol) => {
      m.requireProfile.mockResolvedValue({
        profile: { rol },
        user: { id: userId },
        supabase: { rpc: m.rpc, from: m.from },
      });
      expect(await accountAction("", ficha())).toBe("Sin permiso.");
      expect(m.rpc).not.toHaveBeenCalled();
    },
  );
  it("no permite usar esta opción para cuentas administrativas ni fichas existentes", async () => {
    expect(await accountAction("", ficha({ rol: "DIRECTOR" }))).toContain(
      "solo está disponible",
    );
    expect(
      await accountAction("", ficha({ persona_nueva: "", persona: personId })),
    ).toContain("solo está disponible");
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each(["ci", "rude"])(
    "rechaza %s duplicado antes de insertar",
    async (campo) => {
      m.from.mockReturnValue(query({ id: personId }));
      expect(
        await accountAction("", ficha({ [campo]: "DEMO-DUPLICADO" })),
      ).toMatch(/ya tiene una ficha|ya está registrado/);
      expect(m.rpc).not.toHaveBeenCalled();
      expect(m.invite).not.toHaveBeenCalled();
    },
  );
  it("informa la creación parcial sin invitar ni repetir el registro", async () => {
    m.from.mockReturnValue(query(null));
    expect(await accountAction("", ficha())).toContain(
      "La ficha fue creada. Revísala en Consultar",
    );
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("informa un fallo de guardado sin crear una cuenta", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "23514" } });
    expect(await accountAction("", ficha())).toContain(
      "No se pudo crear la ficha",
    );
    expect(m.createClient).not.toHaveBeenCalled();
  });
});
