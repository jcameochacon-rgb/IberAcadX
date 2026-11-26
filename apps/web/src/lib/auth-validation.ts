export type FormState = { error?: string; success?: string };
export const emptyFormState: FormState = {};
export function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}
export function safeDestination(
  value: string | null,
): "/panel" | "/actualizar-clave" {
  return value === "/actualizar-clave" ? "/actualizar-clave" : "/panel";
}
export function validPassword(
  password: unknown,
  confirm: unknown,
): password is string {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 128 &&
    password === confirm
  );
}
