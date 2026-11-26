import { describe, it, expect } from "vitest";
import { invitationSession } from "./invitation";
describe("invitaciones desde otro dispositivo", () => {
  it("extrae la sesión del fragmento del enlace de invitación", () =>
    expect(
      invitationSession("#access_token=abc&refresh_token=def&type=invite"),
    ).toEqual({ access_token: "abc", refresh_token: "def" }));
  it("rechaza enlaces incompletos o demasiado grandes", () => {
    expect(invitationSession("#access_token=abc")).toBeNull();
    expect(invitationSession("#error=access_denied")).toBeNull();
    expect(
      invitationSession(
        "#access_token=" + "x".repeat(16001) + "&refresh_token=x",
      ),
    ).toBeNull();
  });
});
