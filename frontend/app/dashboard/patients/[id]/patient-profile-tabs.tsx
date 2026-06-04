"use client";

import React, { useState } from "react";
import { ShieldCheck, Calendar, Activity, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type PatientRow = {
  id: string;
  name: string;
  documentID: string;
  email: string;
  phone: string;
  dateOfBirth: string;
};

type MockConsultation = {
  id: string;
  date: string;
  diagnosticCode: string;
  notes: string;
  bloodPressure: string;
  weight: string;
  followUp: boolean;
};

const initialConsultations: MockConsultation[] = [
  {
    id: "1",
    date: "2026-05-15",
    diagnosticCode: "I10 - Hipertensión esencial (primaria)",
    notes: "Paciente asiste a control de rutina. Se evidencia leve mejoría en los valores de tensión arterial con el tratamiento actual. Refiere cefalea ocasional de intensidad leve.",
    bloodPressure: "130/85 mmHg",
    weight: "78 kg",
    followUp: true,
  },
  {
    id: "2",
    date: "2026-04-10",
    diagnosticCode: "E11.9 - Diabetes mellitus no insulinodependiente",
    notes: "Control metabólico. Se ajusta la dosis de metformina. El paciente reporta buena adherencia al plan de alimentación y ejercicio. Exámenes de laboratorio muestran HbA1c estable.",
    bloodPressure: "120/80 mmHg",
    weight: "79.5 kg",
    followUp: false,
  },
];

const consultationSchema = z.object({
  notes: z.string().min(10, {
    message: "Clinical notes must be at least 10 characters.",
  }),
  bloodPressure: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || /^\d{2,3}\/\d{2,3}$/.test(val), {
      message: "Tensión arterial debe tener el formato PAS/PAD (ej. 120/80).",
    }),
  weight: z
    .union([z.string(), z.number()])
    .optional()
    .or(z.literal("")),
  followUp: z.boolean(),
  diagnosticCode: z.string().min(1, {
    message: "Diagnostic code is required.",
  }),
});

type FormValues = z.infer<typeof consultationSchema>;

type PatientProfileTabsProps = {
  patient: PatientRow;
};

export default function PatientProfileTabs({ patient }: PatientProfileTabsProps) {
  const [consultations, setConsultations] = useState<MockConsultation[]>(initialConsultations);
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      notes: "",
      bloodPressure: "",
      weight: "",
      followUp: false,
      diagnosticCode: "R50.9",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMessage(null);

    // Empaquetar metadata JSONB
    const metadata = {
      bloodPressure: values.bloodPressure || undefined,
      weight: values.weight || undefined,
      followUp: values.followUp,
    };

    const payload = {
      diagnostic_code: values.diagnosticCode,
      notes: values.notes,
      metadata: metadata,
      doctor_id: "00000000-0000-0000-0000-000000000000", // UUID Genérico simulado (resuelto en backend)
    };

    try {
      const response = await fetch(`/api/patients/${patient.id}/consultations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar la consulta");
      }

      setSuccessMsg("¡Consulta registrada exitosamente en la historia clínica!");
      
      // Agregar al historial local
      const newConsultation: MockConsultation = {
        id: String(Date.now()),
        date: new Date().toISOString().split("T")[0],
        diagnosticCode: getDiagnosticLabel(values.diagnosticCode),
        notes: values.notes,
        bloodPressure: values.bloodPressure ? `${values.bloodPressure} mmHg` : "N/A",
        weight: values.weight ? `${values.weight} kg` : "N/A",
        followUp: values.followUp,
      };

      setConsultations([newConsultation, ...consultations]);
      
      // Limpiar formulario
      form.reset({
        notes: "",
        bloodPressure: "",
        weight: "",
        followUp: false,
        diagnosticCode: "R50.9",
      });

      // Limpiar mensaje tras 4 segundos
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado al guardar consulta");
    } finally {
      setIsSaving(false);
    }
  };

  const getDiagnosticLabel = (code: string) => {
    switch (code) {
      case "R50.9":
        return "R50.9 - Fiebre, no especificada";
      case "K35.8":
        return "K35.8 - Apendicitis aguda, otra y la no especificada";
      case "J00":
        return "J00 - Rinofaringitis aguda (resfriado común)";
      case "I10":
        return "I10 - Hipertensión esencial (primaria)";
      default:
        return `${code} - Diagnóstico registrado`;
    }
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="history" className="rounded-lg py-2 font-semibold">
            Consultation History
          </TabsTrigger>
          <TabsTrigger value="new" className="rounded-lg py-2 font-semibold">
            New Consultation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="focus-visible:outline-none">
          <Card className="border-border bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="size-5 text-emerald-500" />
                Historial de Consultas
              </CardTitle>
              <CardDescription>
                Registro cronológico de atenciones médicas y evoluciones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consultations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay consultas registradas para este paciente.
                </div>
              ) : (
                <div className="relative border-l border-border pl-6 ml-3 space-y-8">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-background group-hover:bg-emerald-500/30 transition-colors">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </span>

                      {/* Header with Date and Diagnostics */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <time className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {consultation.date}
                          </time>
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                            {consultation.diagnosticCode}
                          </span>
                        </div>
                        {consultation.followUp && (
                          <span className="inline-flex self-start sm:self-auto items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 tracking-wider uppercase">
                            Reevaluación Requerida
                          </span>
                        )}
                      </div>

                      {/* Notes Box */}
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 transition hover:bg-muted/40">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {consultation.notes}
                        </p>
                        
                        {/* Vitals & Metadata Grid */}
                        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Activity className="size-3.5 text-emerald-500/70" />
                            <span>Presión Arterial:</span>
                            <span className="font-medium text-foreground">{consultation.bloodPressure}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>Peso:</span>
                            <span className="font-medium text-foreground">{consultation.weight}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="focus-visible:outline-none">
          <Card className="border-border bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <PlusClinicalIcon />
                Nueva Consulta de Medicina General
              </CardTitle>
              <CardDescription>
                Registre la evolución del paciente, signos vitales y datos de la consulta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Diagnostic Select */}
                  <FormField
                    control={form.control}
                    name="diagnosticCode"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Código de Diagnóstico Principal (CIE-10)</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-11 w-full rounded-xl border-border">
                              <SelectValue placeholder="Seleccione un diagnóstico" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="R50.9">R50.9 - Fiebre, no especificada</SelectItem>
                              <SelectItem value="K35.8">K35.8 - Apendicitis aguda, otra y la no especificada</SelectItem>
                              <SelectItem value="J00">J00 - Rinofaringitis aguda (resfriado común)</SelectItem>
                              <SelectItem value="I10">I10 - Hipertensión esencial (primaria)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes Textarea */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Notas Clínicas / Evolución</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Detalle la sintomatología, examen físico y tratamiento sugerido para el paciente..."
                            className="min-h-[160px] rounded-xl resize-none border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Vitals & Metadata Section */}
                  <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <Activity className="size-4 text-emerald-500" />
                      Signos Vitales y Metadatos Dinámicos (JSONB)
                    </h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="bloodPressure"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Tensión Arterial</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej. 120/80"
                                className="h-11 rounded-xl border-border"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Peso (kg)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej. 75"
                                className="h-11 rounded-xl border-border"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="followUp"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
                          <div className="space-y-0.5">
                            <FormLabel className="font-semibold text-sm">Reevaluación Requerida</FormLabel>
                            <FormDescription>
                              Indica si el paciente necesita una consulta de seguimiento próximamente.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                      {errorMessage}
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4 shrink-0" />
                      {successMsg}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="h-11 rounded-xl bg-emerald-500 px-6 font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
                          Guardando...
                        </>
                      ) : (
                        "Save Consultation"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlusClinicalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 text-emerald-500"
    >
      <path d="M19 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3H5C3.34 2 2 3.34 2 5v6c0 1.66 1.34 3 3 3" />
      <path d="M12 2v20" />
      <path d="M17 12H7" />
    </svg>
  );
}
