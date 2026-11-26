"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: content remains visible without JavaScript. */
export function VisualMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    const targets = element.querySelectorAll("[data-reveal]");
    if (!preference.matches) {
      targets.forEach((target) => {
        if (target.getBoundingClientRect().top > window.innerHeight) {
          target.classList.add("reveal-pending");
          observer.observe(target);
        }
      });
    }
    const showAll = () => {
      if (preference.matches)
        targets.forEach((t) => t.classList.add("is-visible"));
    };
    preference.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", showAll);
    };
  }, []);
  return <div ref={root}>{children}</div>;
}
