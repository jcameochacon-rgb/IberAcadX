import type { Module, Role } from "@iberdrola/shared";
export function panelHref(
  model: { demo: boolean; role: Role },
  module?: Module,
) {
  return model.demo
    ? `/demo${module ? `/${module}` : ""}?rol=${model.role}`
    : `/panel${module ? `/${module}` : ""}`;
}
