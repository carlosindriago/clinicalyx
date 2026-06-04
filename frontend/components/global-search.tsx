"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const documentID = searchParams.get("document_id") ?? "";
  const [query, setQuery] = useState(documentID);

  // Sync state with URL parameter (e.g. if cleared or changed elsewhere)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(documentID);
  }, [documentID]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    
    startTransition(() => {
      if (cleanQuery) {
        router.push(`/dashboard/patients?document_id=${encodeURIComponent(cleanQuery)}`);
      } else {
        router.push("/dashboard/patients");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-xl flex-1">
      <button
        type="submit"
        disabled={isPending}
        className="absolute left-3 top-1/2 size-8 -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        aria-label="Search patient"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-emerald-500" aria-hidden="true" />
        ) : (
          <Search className="size-4" aria-hidden="true" />
        )}
      </button>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        aria-label="Global search"
        placeholder="Search patients by exact Document ID..."
        className="h-10 rounded-xl border-border bg-muted/40 pl-10 text-sm shadow-sm focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
        disabled={isPending}
        autoComplete="off"
      />
    </form>
  );
}
