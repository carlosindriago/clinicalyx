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
        className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[16px] text-teal-600 transition-colors hover:text-teal-700 disabled:opacity-50 dark:text-teal-300 dark:hover:text-teal-200"
        aria-label="Buscar paciente"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-teal-500" aria-hidden="true" />
        ) : (
          <Search className="size-4" aria-hidden="true" />
        )}
      </button>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        aria-label="Buscador global"
        placeholder="Buscar pacientes por número de documento exacto..."
        className="h-14 rounded-[22px] border-white/60 bg-white/72 pl-14 text-sm shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)] placeholder:text-slate-500 focus-visible:border-teal-400 focus-visible:ring-teal-500/20 dark:border-white/8 dark:bg-slate-950/48 dark:placeholder:text-slate-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_8px_20px_rgba(0,0,0,0.24)]"
        disabled={isPending}
        autoComplete="off"
      />
    </form>
  );
}
