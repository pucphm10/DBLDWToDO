import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronDown, ChevronRight, CirclePlus, Clock3, Filter,
  MessageSquarePlus, Plus, Search, Scissors, Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Field, Input, Modal, Notice, Progress } from "../components/ui";
import {
  addProductionTask, addSubtask, getProduction, setSectionCollapsed,
  toggleQualityCheck, updateProduction, updateSubtaskStatus, updateTaskStatus
} from "../features/data/api";
import { calculateProgress } from "../lib/progress";
import { normalizeTimecode } from "../lib/timecode";
import { formatDate, humanizeError } from "../lib/utils";
import type { TaskStatus } from "../types/domain";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "open", label: "Offen" }, { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" }, { value: "skipped", label: "Übersprungen" },
  { value: "blocked", label: "Blockiert" }
];
const productionStatuses = [
  ["planned","Geplant"],["prepared","Vorbereitet"],["in_production","In Produktion"],
  ["editing","Im Schnitt"],["quality_control","Qualitätskontrolle"],["ready","Bereit zur Veröffentlichung"],
  ["published","Veröffentlicht"],["archived","Archiviert"]
];

export function ProductionDetailPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["production", id], queryFn: () => getProduction(id), enabled: Boolean(id) });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [quickType, setQuickType] = useState<string | null>(null);
  const [targetTask, setTargetTask] = useState<string | null>(null);
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState("");
  const [timecode, setTimecode] = useState("");
  const [error, setError] = useState("");
  const invalidate = () => client.invalidateQueries({ queryKey: ["production", id] });
  const taskStatus = useMutation({ mutationFn: ({taskId,status}:{taskId:string;status:TaskStatus}) => updateTaskStatus(taskId,status), onSuccess: invalidate });
  const subtaskStatus = useMutation({ mutationFn: ({subtaskId,status}:{subtaskId:string;status:TaskStatus}) => updateSubtaskStatus(subtaskId,status), onSuccess: invalidate });
  const checkMutation = useMutation({ mutationFn: ({checkId,value}:{checkId:string;value:boolean}) => toggleQualityCheck(checkId,value), onSuccess: invalidate });
  const production = query.data;
  const progress = production ? calculateProgress(production) : null;
  const sections = useMemo(() => (production?.production_sections ?? []).map((section) => ({
    ...section,
    production_tasks: section.production_tasks.filter((task) => {
      const text = `${task.title} ${task.hint} ${task.production_subtasks.map(s => `${s.title} ${s.timecode ?? ""}`).join(" ")}`.toLowerCase();
      const statusMatch = filter === "all" || (filter === "required" ? task.is_required : filter === "custom" ? task.origin === "custom" : task.status === filter);
      return statusMatch && text.includes(search.toLowerCase());
    })
  })).filter((section) => section.production_tasks.length || (!search && filter === "all")), [production, search, filter]);
  if (query.isLoading) return <div className="h-[70vh] animate-pulse rounded-2xl bg-white" />;
  if (!production || !progress) return <Notice tone="error">Diese Produktion konnte nicht geladen werden.</Notice>;
  const allTasks = production.production_sections?.flatMap(s => s.production_tasks) ?? [];

  async function addQuick() {
    setError("");
    const normalized = timecode ? normalizeTimecode(timecode) : null;
    if (timecode && !normalized) { setError("Zeitcode als 12:43 oder 1:12:43 eingeben."); return; }
    const target = targetTask || allTasks.find(task => task.task_type === quickType)?.id;
    if (!target) { setError("In dieser Vorlage gibt es keine passende Zielaufgabe."); return; }
    try { await addSubtask({ taskId: target, title: entryTitle, timecode: normalized }); setQuickType(null); setEntryTitle(""); setTimecode(""); setTargetTask(null); await invalidate(); }
    catch (e) { setError(humanizeError(e)); }
  }

  return <div className="grid gap-6">
    <Link to="/productions" className="inline-flex items-center gap-2 text-sm font-semibold text-black/45 hover:text-ink"><ArrowLeft size={16} />Alle Produktionen</Link>
    <section className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
      <div><div className="flex flex-wrap items-center gap-2"><Badge tone="green">{production.formats?.name}</Badge><Badge>Vorlage V{production.template_versions?.version_number ?? "–"}</Badge>{production.priority === 1 && <Badge tone="red">Hohe Priorität</Badge>}</div><input aria-label="Arbeitstitel" defaultValue={production.working_title} placeholder="Unbenannte Produktion" className="mt-3 w-full bg-transparent font-display text-3xl font-extrabold tracking-tight outline-none placeholder:text-black/25 sm:text-4xl" onBlur={(e) => { if(e.target.value !== production.working_title) void updateProduction(id,{working_title:e.target.value}).then(invalidate); }} /><div className="mt-3 flex flex-wrap gap-5 text-sm text-black/45"><span className="flex items-center gap-2"><Clock3 size={16} />Produktion {formatDate(production.production_date)}</span><span className="flex items-center gap-2">Release {formatDate(production.planned_publish_date)}</span></div></div>
      <select aria-label="Produktionsstatus" value={production.status} onChange={(e) => void updateProduction(id,{status:e.target.value}).then(invalidate)} className="min-h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold">{productionStatuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-5 sm:col-span-2"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-black/35">Gesamtfortschritt</p><p className="mt-1 font-display text-3xl font-extrabold">{progress.total}%</p></div><div className="grid size-12 place-items-center rounded-2xl bg-moss-100 text-moss-700"><Sparkles size={22} /></div></div><div className="mt-4"><Progress value={progress.total} /></div></Card>
      <Card className="p-5"><p className="text-xs font-bold text-black/35">OFFENE PFLICHTAUFGABEN</p><p className="mt-2 font-display text-3xl font-extrabold">{progress.openRequired}</p><p className="mt-1 text-xs text-black/40">Pflichtfortschritt {progress.required}%</p></Card>
      <Card className="p-5"><p className="text-xs font-bold text-black/35">OFFENE SCHNITTPUNKTE</p><p className="mt-2 font-display text-3xl font-extrabold">{progress.openEditPoints}</p><p className="mt-1 text-xs text-black/40">{progress.qualityDone}/{progress.qualityTotal} Qualitätschecks</p></Card>
    </section>

    <section className="flex flex-wrap gap-2"><Button size="sm" onClick={() => {setQuickType("edit_point");setTargetTask(null);}}><Scissors size={15} />Schnittpunkt</Button><Button size="sm" variant="secondary" onClick={() => {setQuickType("overlay");setTargetTask(null);}}><Plus size={15} />Einblendung</Button><Button size="sm" variant="secondary" onClick={() => {setQuickType("insert");setTargetTask(null);}}><Plus size={15} />Einspieler</Button><Button size="sm" variant="secondary" onClick={() => {setQuickType("note");setTargetTask(null);}}><MessageSquarePlus size={15} />Notiz</Button></section>

    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3.5 top-3.5 text-black/30" size={17} /><Input className="pl-10" placeholder="Aufgaben, Hinweise oder Zeitcodes durchsuchen …" value={search} onChange={(e) => setSearch(e.target.value)} /></div><label className="relative"><Filter className="pointer-events-none absolute left-3.5 top-3.5 text-black/30" size={17} /><select value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-11 min-w-48 rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm"><option value="all">Alle Aufgaben</option><option value="open">Offen</option><option value="done">Erledigt</option><option value="blocked">Blockiert</option><option value="required">Nur Pflicht</option><option value="custom">Individuell</option></select></label></div>

    <div className="grid gap-4">{sections.map((section) => <Card key={section.id} className="overflow-hidden">
      <button onClick={() => void setSectionCollapsed(section.id,!section.is_collapsed).then(invalidate)} className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-5"><div><h3 className="font-display font-extrabold">{section.title}</h3><p className="mt-0.5 text-xs text-black/35">{section.production_tasks.filter(t => t.status === "done").length} von {section.production_tasks.length} erledigt</p></div>{section.is_collapsed ? <ChevronRight size={19} /> : <ChevronDown size={19} />}</button>
      {!section.is_collapsed && <div className="divide-y divide-black/[0.05] border-t border-black/[0.05]">{section.production_tasks.map((task) => <div key={task.id} className="px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3"><button aria-label={`${task.title} ${task.status === "done" ? "wieder öffnen" : "erledigen"}`} onClick={() => taskStatus.mutate({taskId:task.id,status:task.status === "done" ? "open" : "done"})} className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition ${task.status === "done" ? "border-moss-600 bg-moss-600 text-white" : "border-black/20 hover:border-moss-500"}`}>{task.status === "done" && "✓"}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={`text-sm font-semibold leading-5 ${task.status === "done" ? "text-black/35 line-through" : ""}`}>{task.title}</p><Badge tone={task.is_required ? "blue" : "neutral"}>{task.is_required ? "Pflicht" : "Optional"}</Badge>{task.origin === "custom" && <Badge tone="amber">Individuell</Badge>}</div>{task.hint && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{task.hint}</div>}
          {task.production_subtasks.length > 0 && <div className="mt-3 grid gap-2">{task.production_subtasks.map((subtask) => <div key={subtask.id} className="flex items-start gap-2.5 rounded-lg bg-black/[0.025] px-3 py-2"><button aria-label="Unteraufgabe umschalten" onClick={() => subtaskStatus.mutate({subtaskId:subtask.id,status:subtask.status === "done" ? "open" : "done"})} className={`mt-0.5 size-4 shrink-0 rounded border ${subtask.status === "done" ? "border-moss-500 bg-moss-500" : "border-black/20"}`} /><div className="min-w-0 text-xs"><span className={subtask.status === "done" ? "text-black/35 line-through" : ""}>{subtask.title}</span>{subtask.timecode && <span className="ml-2 rounded bg-white px-1.5 py-0.5 font-mono font-bold text-moss-700">{subtask.timecode}</span>}</div></div>)}</div>}
          {task.production_quality_checks.length > 0 && <div className="mt-3 rounded-xl bg-moss-50 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-moss-700">Qualitätscheck</p>{task.production_quality_checks.map((check) => <label key={check.id} className="flex min-h-8 items-center gap-2 text-xs"><input type="checkbox" checked={check.is_completed} onChange={() => checkMutation.mutate({checkId:check.id,value:!check.is_completed})} className="size-4 accent-moss-600" />{check.title}</label>)}</div>}
        </div><div className="flex shrink-0 items-center gap-1"><select aria-label={`Status für ${task.title}`} value={task.status} onChange={(e) => taskStatus.mutate({taskId:task.id,status:e.target.value as TaskStatus})} className="h-8 max-w-28 rounded-lg border border-black/10 bg-white px-2 text-[11px] font-semibold">{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Button variant="ghost" size="icon" className="size-8" onClick={() => {setQuickType(task.task_type);setTargetTask(task.id);}} aria-label="Unteraufgabe hinzufügen"><CirclePlus size={16} /></Button></div></div>
      </div>)}
      <button onClick={() => {setNewTaskSection(section.id);setEntryTitle("");}} className="flex w-full items-center gap-2 px-5 py-3 text-sm font-bold text-moss-700 hover:bg-moss-50"><Plus size={16} />Aufgabe hinzufügen</button></div>}
    </Card>)}</div>

    <Card className="p-5"><Field label="Produktionsnotizen" hint="Wird beim Verlassen des Feldes gespeichert."><textarea defaultValue={production.notes} onBlur={(e) => { if(e.target.value !== production.notes) void updateProduction(id,{notes:e.target.value}).then(invalidate); }} className="min-h-28 w-full resize-y rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-moss-500" placeholder="Besonderheiten, offene Fragen oder Learnings …" /></Field></Card>

    {quickType && <Modal title={quickType === "edit_point" ? "Schnittpunkt hinzufügen" : "Unterpunkt hinzufügen"} onClose={() => {setQuickType(null);setError("");}}><form onSubmit={(e) => {e.preventDefault();void addQuick();}} className="grid gap-4">{quickType === "edit_point" && <Field label="Zeitcode" error={error && timecode ? error : undefined} hint="12:43 oder 1:12:43"><Input autoFocus value={timecode} onChange={(e) => setTimecode(e.target.value)} placeholder="12:43" /></Field>}<Field label="Beschreibung" error={error && !timecode ? error : undefined}><Input autoFocus={quickType !== "edit_point"} required value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} placeholder="Was ist zu tun?" /></Field>{!targetTask && !allTasks.some(t => t.task_type === quickType) && <Field label="Zielaufgabe"><select required value={targetTask ?? ""} onChange={(e) => setTargetTask(e.target.value)} className="min-h-11 rounded-xl border border-black/10 px-3"><option value="">Aufgabe wählen …</option>{allTasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>}{error && !timecode && <Notice tone="error">{error}</Notice>}<Button type="submit" disabled={!entryTitle.trim()}>Hinzufügen</Button></form></Modal>}
    {newTaskSection && <Modal title="Individuelle Aufgabe" onClose={() => setNewTaskSection(null)}><form onSubmit={async (e) => {e.preventDefault();await addProductionTask({sectionId:newTaskSection,title:entryTitle});setNewTaskSection(null);setEntryTitle("");await invalidate();}} className="grid gap-4"><Field label="Aufgabentitel"><Input autoFocus required value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} /></Field><Notice>Individuelle Aufgaben werden als Nutzungssignal für spätere Lernvorschläge erfasst.</Notice><Button type="submit" disabled={!entryTitle.trim()}>Aufgabe hinzufügen</Button></form></Modal>}
  </div>;
}
