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
      size="icon"
      aria-label="Toggle color theme"
      className="rounded-full border border-border bg-background/70 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
      onClick={() => setTheme(nextTheme)}
    >
      <Sun className="hidden size-4 text-emerald-500 dark:block" aria-hidden="true" />
      <Moon className="size-4 text-emerald-500 dark:hidden" aria-hidden="true" />
    </Button>
  );
}
