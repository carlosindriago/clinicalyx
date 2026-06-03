import { Bell, Search } from "lucide-react";

import { Sidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <div className="relative max-w-xl flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Global search"
                placeholder="Search patients, schedules, or records..."
                disabled
                className="h-10 rounded-xl border-border bg-muted/40 pl-10 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-100"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative rounded-full border border-border bg-background/70 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
            >
              <Bell className="size-4" aria-hidden="true" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </Button>

            <ThemeToggle />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
