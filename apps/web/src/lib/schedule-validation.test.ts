import { describe, it, expect } from "vitest";
import {
  scheduleTimes,
  scheduleDay,
  checkScheduleId,
} from "./schedule-validation";
describe("horarios", () => {
  it("acepta 40 minutos dentro del turno", () => {
    expect(scheduleTimes("14:00", "14:40").start).toBe("14:00");
    expect(scheduleTimes("17:25", "18:05").end).toBe("18:05");
  });
  it("rechaza vacíos, horas inválidas, duración y turno", () => {
    for (const [a, b] of [
      ["", ""],
      ["25:00", "25:40"],
      ["14:00", "14:39"],
      ["13:59", "14:39"],
      ["17:30", "18:10"],
    ])
      expect(() => scheduleTimes(a, b)).toThrow();
  });
  it("solo permite días lectivos válidos", () => {
    expect(scheduleDay("1")).toBe(1);
    expect(scheduleDay("5")).toBe(5);
    for (const d of ["", "0", "6", "1.5", "NaN"])
      expect(() => scheduleDay(d)).toThrow();
  });
  it("valida identificadores", () => {
    expect(
      checkScheduleId("00000000-0000-4000-8000-000000000001"),
    ).toBeTruthy();
    expect(() => checkScheduleId("otro")).toThrow();
  });
});
