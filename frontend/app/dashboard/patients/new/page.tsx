"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PatientProxyResponse = {
  id?: unknown;
  error?: unknown;
  code?: unknown;
};

const e164Regex = /^\+[1-9]\d{9,14}$/;

function extractResponseError(payload: PatientProxyResponse) {
  if (typeof payload.error !== "string") {
    return "Unable to register patient";
  }

  const normalized = payload.error.toLowerCase();

  if (normalized.includes("e.164") || normalized.includes("phone")) {
    return "Invalid E.164 format. Use a value like +1234567890.";
  }

  if (normalized.includes("documento") || normalized.includes("document")) {
    return "Invalid or duplicated Document ID. Search by the exact value before registering.";
  }

  return payload.error;
}

export default function NewPatientPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentID, setDocumentID] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedDateOfBirth = useMemo(() => {
    return dateOfBirth ? format(dateOfBirth, "PPP") : "Select date of birth";
  }, [dateOfBirth]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedPhone = phone.replaceAll(" ", "").trim();

    if (!dateOfBirth) {
      setErrorMessage("Select the patient's date of birth before saving.");
      return;
    }

    if (!e164Regex.test(normalizedPhone)) {
      setErrorMessage("Invalid E.164 format. Use a value like +1234567890.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          document_id: documentID.trim(),
          document_type: "DNI",
          email: email.trim(),
          phone: normalizedPhone,
          date_of_birth: format(dateOfBirth, "yyyy-MM-dd"),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as PatientProxyResponse;

      if (!response.ok) {
        setErrorMessage(extractResponseError(payload));
        return;
      }

      router.push("/dashboard/patients");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unexpected patient registration error";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-emerald-500">
          Clinical intake
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Register Patient
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Create a protected patient profile. Document ID searches must be exact because sensitive identifiers are encrypted and indexed with blind indexes.
        </p>
      </div>

      <Card className="overflow-hidden border-border bg-card/95 shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Patient demographics</CardTitle>
              <CardDescription>
                Store the minimum clinical identity data required for the MVP.
              </CardDescription>
            </div>
            <div className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:flex sm:items-center sm:gap-2">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              AES-GCM protected
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Alice"
                  className="h-11 rounded-xl"
                  autoComplete="given-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Walker"
                  className="h-11 rounded-xl"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document-id">Document ID</Label>
                <Input
                  id="document-id"
                  required
                  value={documentID}
                  onChange={(event) => setDocumentID(event.target.value)}
                  placeholder="Exact DNI value"
                  className="h-11 rounded-xl font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  MVP uses DNI as the default document type.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start rounded-xl text-left font-normal",
                          !dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4 text-emerald-500" aria-hidden="true" />
                        {formattedDateOfBirth}
                      </Button>
                    }
                  />
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateOfBirth}
                      onSelect={setDateOfBirth}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="alice.walker@example.com"
                  className="h-11 rounded-xl"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+1234567890"
                  className="h-11 rounded-xl"
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  E.164 format required. Include country code and no local separators.
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-xl"
                onClick={() => router.push("/dashboard/patients")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-emerald-500 px-5 font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  "Save Patient"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
