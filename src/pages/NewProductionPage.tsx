import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, WandSparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Card, Field, Input, Notice } from "../components/ui";
import { createProduction, listTemplates } from "../features/data/api";
import { humanizeError } from "../lib/utils";

const schema = z.object({
  templateId: z.string().min(1, "Bitte wähle eine Vorlage."),
  workingTitle: z.string().max(240),
  productionDate: z.string().min(1, "Produktionsdatum fehlt."),
  plannedPublishDate: z.string().min(1, "Veröffentlichungsdatum fehlt."),
  priority: z.string(),
  notes: z.string().max(20000)
}).refine((value) => value.productionDate <= value.plannedPublishDate, {
  path: ["plannedPublishDate"], message: "Die Veröffentlichung muss nach der Produktion liegen."
});
type Values = z.infer<typeof schema>;

export function NewProductionPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const today = new Date().toISOString().slice(0,10);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { templateId: "", workingTitle: "", productionDate: today, plannedPublishDate: today, priority: "", notes: "" } });
  const mutation = useMutation({
    mutationFn: createProduction,
    onSuccess: async (id) => { await client.invalidateQueries({ queryKey: ["productions"] }); navigate(`/productions/${id}`); }
  });
  const submit = form.handleSubmit((values) => mutation.mutate({
    ...values, priority: values.priority ? Number(values.priority) : null
  }));
  return <div className="mx-auto max-w-3xl">
    <Link to="/productions" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-black/45 hover:text-ink"><ArrowLeft size={16} />Zurück</Link>
    <div className="mb-7"><div className="flex items-center gap-2 text-sm font-bold text-moss-600"><WandSparkles size={16} />Aus Vorlage erstellen</div><h2 className="mt-2 font-display text-3xl font-extrabold">Neue Produktion</h2><p className="mt-2 text-sm text-black/45">Du erhältst eine unabhängige Kopie der aktuellen Vorlagenversion.</p></div>
    <Card className="p-5 sm:p-8"><form onSubmit={submit} className="grid gap-5">
      <Field label="Format & Vorlage" error={form.formState.errors.templateId?.message}><select className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm" {...form.register("templateId")}><option value="">Vorlage wählen …</option>{templates.data?.map((template) => <option key={template.id} value={template.id}>{template.formats?.name} · {template.name} · Version {template.template_versions?.[0]?.version_number ?? 1}</option>)}</select></Field>
      <Field label="Arbeitstitel" hint="Optional – du kannst ihn später ändern."><Input placeholder="z. B. Klassiker Runde 2" {...form.register("workingTitle")} /></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Produktionsdatum" error={form.formState.errors.productionDate?.message}><Input type="date" {...form.register("productionDate")} /></Field><Field label="Geplante Veröffentlichung" error={form.formState.errors.plannedPublishDate?.message}><Input type="date" {...form.register("plannedPublishDate")} /></Field></div>
      <div className="grid gap-5 sm:grid-cols-[0.55fr_1.45fr]"><Field label="Priorität"><select className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm" {...form.register("priority")}><option value="">Normal</option><option value="1">Hoch</option><option value="2">Mittel</option><option value="3">Niedrig</option></select></Field><Field label="Notiz"><Input placeholder="Was muss bei dieser Folge besonders beachtet werden?" {...form.register("notes")} /></Field></div>
      {mutation.error && <Notice tone="error">{humanizeError(mutation.error)}</Notice>}
      <div className="mt-2 flex flex-col-reverse gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:justify-end"><Link to="/productions"><Button type="button" variant="ghost" className="w-full sm:w-auto">Abbrechen</Button></Link><Button type="submit" disabled={mutation.isPending || templates.isLoading} className="w-full sm:w-auto"><CalendarPlus size={17} />{mutation.isPending ? "Wird angelegt …" : "Produktion anlegen"}</Button></div>
    </form></Card>
  </div>;
}
