"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label="Cambiar tema de color"
      className="rounded-[20px] border border-white/60 bg-white/70 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)] backdrop-blur transition hover:bg-white/85 hover:text-teal-800 dark:border-white/8 dark:bg-slate-950/50 dark:text-teal-300 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),8px_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-slate-900/70"
      onClick={() => setTheme(nextTheme)}
    >
      <Sun className="hidden size-5 text-teal-300 dark:block" aria-hidden="true" />
      <Moon className="size-5 text-teal-600 dark:hidden" aria-hidden="true" />
    </Button>
  );
}
