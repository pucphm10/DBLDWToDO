import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, Circle, CircleAlert,
  CirclePlus, Clock3, Filter, MessageSquarePlus, Minus, Pencil,
  Play, Plus, Search, Scissors, Sparkles, Trash2
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, Field, Input, Modal, Notice, Progress } from "../components/ui";
import {
  addProductionTask, addSubtask, deleteProduction, deleteProductionSubtask, deleteProductionTask,
  getProduction, toggleQualityCheck, updateProduction, updateProductionSubtask,
  updateProductionTask, updateSubtaskStatus, updateTaskStatus
} from "../features/data/api";
import { calculateProgress } from "../lib/progress";
import {
  findFocusSection, getVisibleSections, taskStatusPresentation, type TaskFilter
} from "../lib/taskView";
import { normalizeTimecode } from "../lib/timecode";
import { formatDate, humanizeError } from "../lib/utils";
import type { TaskStatus } from "../types/domain";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" },
  { value: "skipped", label: "Übersprungen" },
  { value: "blocked", label: "Blockiert" }
];

const productionStatuses = [
  ["planned", "Geplant"],
  ["prepared", "Vorbereitet"],
  ["in_production", "In Produktion"],
  ["editing", "Im Schnitt"],
  ["quality_control", "Qualitätskontrolle"],
  ["ready", "Bereit zur Veröffentlichung"],
  ["published", "Veröffentlicht"],
  ["archived", "Archiviert"]
];

type EditTarget = {
  type: "task" | "subtask";
  id: string;
  title: string;
};

function TaskStatusIcon({ status }: { status: TaskStatus }) {
  if (status === "done") return <Check size={13} />;
  if (status === "in_progress") return <Play size={11} fill="currentColor" />;
  if (status === "blocked") return <CircleAlert size={13} />;
  if (status === "skipped") return <Minus size={13} />;
  return <Circle size={11} />;
}

export function ProductionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["production", id],
    queryFn: () => getProduction(id),
    enabled: Boolean(id)
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("focus");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [quickType, setQuickType] = useState<string | null>(null);
  const [targetTask, setTargetTask] = useState<string | null>(null);
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [timecode, setTimecode] = useState("");
  const [error, setError] = useState("");
  const invalidate = () => client.invalidateQueries({ queryKey: ["production", id] });
  const taskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) => updateTaskStatus(taskId, status),
    onSuccess: invalidate
  });
  const subtaskStatus = useMutation({
    mutationFn: ({ subtaskId, status }: { subtaskId: string; status: TaskStatus }) => updateSubtaskStatus(subtaskId, status),
    onSuccess: invalidate
  });
  const checkMutation = useMutation({
    mutationFn: ({ checkId, value }: { checkId: string; value: boolean }) => toggleQualityCheck(checkId, value),
    onSuccess: invalidate
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduction(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["productions"] });
      navigate("/productions", { replace: true });
    }
  });
  const production = query.data;
  const progress = production ? calculateProgress(production) : null;
  const allSections = production?.production_sections ?? [];
  const focusSection = findFocusSection(allSections);
  const sections = getVisibleSections(allSections, filter, search);

  if (query.isLoading) return <div className="h-[70vh] animate-pulse rounded-2xl bg-white" />;
  if (!production || !progress) return <Notice tone="error">Diese Produktion konnte nicht geladen werden.</Notice>;

  const allTasks = production.production_sections?.flatMap((section) => section.production_tasks) ?? [];
  const focusTaskCount = focusSection?.production_tasks
    .filter((task) => ["open", "in_progress", "blocked"].includes(task.status)).length ?? 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  async function addQuick() {
    setError("");
    const normalized = timecode ? normalizeTimecode(timecode) : null;
    if (timecode && !normalized) {
      setError("Zeitcode als 12:43 oder 1:12:43 eingeben.");
      return;
    }
    const target = targetTask || allTasks.find((task) => task.task_type === quickType)?.id;
    if (!target) {
      setError("In dieser Vorlage gibt es keine passende Zielaufgabe.");
      return;
    }
    try {
      await addSubtask({ taskId: target, title: entryTitle, timecode: normalized });
      setQuickType(null);
      setEntryTitle("");
      setTimecode("");
      setTargetTask(null);
      await invalidate();
    } catch (caughtError) {
      setError(humanizeError(caughtError));
    }
  }

  async function saveEdit() {
    if (!editTarget || !entryTitle.trim()) return;
    if (editTarget.type === "task") {
      await updateProductionTask(editTarget.id, { title: entryTitle.trim() });
    } else {
      await updateProductionSubtask(editTarget.id, { title: entryTitle.trim() });
    }
    setEditTarget(null);
    setEntryTitle("");
    await invalidate();
  }

  return <div className="grid gap-5 sm:gap-6">
    <Link to="/productions" className="inline-flex items-center gap-2 text-sm font-semibold text-black/45 hover:text-ink">
      <ArrowLeft size={16} />Alle Produktionen
    </Link>

    <section className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{production.formats?.name}</Badge>
          <Badge>Vorlage V{production.template_versions?.version_number ?? "–"}</Badge>
          {production.priority === 1 && <Badge tone="red">Hohe Priorität</Badge>}
        </div>
        <input
          aria-label="Arbeitstitel"
          defaultValue={production.working_title}
          placeholder="Unbenannte Produktion"
          className="mt-3 w-full bg-transparent font-display text-3xl font-extrabold tracking-tight outline-none placeholder:text-black/25 sm:text-4xl"
          onBlur={(event) => {
            if (event.target.value !== production.working_title) {
              void updateProduction(id, { working_title: event.target.value }).then(invalidate);
            }
          }}
        />
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-black/45 sm:gap-5">
          <span className="flex items-center gap-2"><Clock3 size={16} />Produktion {formatDate(production.production_date)}</span>
          <span className="flex items-center gap-2">Release {formatDate(production.planned_publish_date)}</span>
        </div>
      </div>
      <div className="grid gap-2 sm:flex xl:grid">
        <select
          aria-label="Produktionsstatus"
          value={production.status}
          onChange={(event) => void updateProduction(id, { status: event.target.value }).then(invalidate)}
          className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold sm:w-auto"
        >
          {productionStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={16} />Produktion löschen
        </Button>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Card className="col-span-2 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-black/35">Gesamtfortschritt</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{progress.total}%</p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-moss-100 text-moss-700"><Sparkles size={22} /></div>
        </div>
        <div className="mt-4"><Progress value={progress.total} /></div>
      </Card>
      <Card className="p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase leading-4 text-black/35 sm:text-xs">Offene Pflichtaufgaben</p>
        <p className="mt-2 font-display text-3xl font-extrabold">{progress.openRequired}</p>
        <p className="mt-1 hidden text-xs text-black/40 sm:block">Pflichtfortschritt {progress.required}%</p>
      </Card>
      <Card className="p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase leading-4 text-black/35 sm:text-xs">Offene Schnittpunkte</p>
        <p className="mt-2 font-display text-3xl font-extrabold">{progress.openEditPoints}</p>
        <p className="mt-1 hidden text-xs text-black/40 sm:block">{progress.qualityDone}/{progress.qualityTotal} Prüfpunkte</p>
      </Card>
    </section>

    <section className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => { setQuickType("edit_point"); setTargetTask(null); }}>
        <Scissors size={15} />Schnittpunkt
      </Button>
      <Button size="sm" variant="secondary" onClick={() => { setQuickType("overlay"); setTargetTask(null); }}>
        <Plus size={15} />Einblendung
      </Button>
      <Button size="sm" variant="secondary" onClick={() => { setQuickType("insert"); setTargetTask(null); }}>
        <Plus size={15} />Einspieler
      </Button>
      <Button size="sm" variant="secondary" onClick={() => { setQuickType("note"); setTargetTask(null); }}>
        <MessageSquarePlus size={15} />Notiz
      </Button>
    </section>

    {filter === "focus" && !search && <Card className="border-blue-200 bg-blue-50/60 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-800"><Play size={15} fill="currentColor" />Jetzt im Fokus</div>
          <h3 className="mt-1 font-display text-lg font-extrabold">{focusSection?.title ?? "Alles erledigt"}</h3>
          <p className="mt-1 text-xs leading-5 text-blue-950/55">
            {focusSection
              ? `${focusTaskCount} relevante Aufgaben in diesem Arbeitsbereich. Am Handy werden zuerst sechs, am Desktop zwölf gezeigt.`
              : "In dieser Produktion sind keine offenen Aufgaben mehr vorhanden."}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setFilter("all")}>Alle Bereiche</Button>
      </div>
    </Card>}

    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-3.5 text-black/30" size={17} />
        <Input
          className="pl-10"
          placeholder="Aufgaben, Hinweise oder Zeitcodes durchsuchen …"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <label className="relative">
        <Filter className="pointer-events-none absolute left-3.5 top-3.5 text-black/30" size={17} />
        <select
          aria-label="Aufgaben filtern"
          value={filter}
          onChange={(event) => setFilter(event.target.value as TaskFilter)}
          className="min-h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm sm:min-w-52"
        >
          <option value="focus">Jetzt im Fokus</option>
          <option value="all">Alle Bereiche</option>
          <option value="in_progress">In Arbeit</option>
          <option value="open">Offen</option>
          <option value="blocked">Blockiert</option>
          <option value="skipped">Übersprungen</option>
          <option value="done">Erledigt</option>
          <option value="required">Nur Pflicht</option>
          <option value="custom">Individuell</option>
        </select>
      </label>
    </div>

    <div className="grid gap-3 sm:gap-4">
      {sections.map((section) => {
        const automaticallyOpen = filter !== "all" || Boolean(search);
        const isOpen = automaticallyOpen || expandedSections.has(section.id);
        const originalSection = allSections.find((item) => item.id === section.id);
        const originalTasks = originalSection?.production_tasks ?? section.production_tasks;

        return <Card key={section.id} className="overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(section.id)}
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
          >
            <div className="min-w-0">
              <h3 className="truncate font-display font-extrabold">{section.title}</h3>
              <p className="mt-0.5 text-xs text-black/35">
                {originalTasks.filter((task) => task.status === "done").length} erledigt · {originalTasks.length} gesamt
              </p>
            </div>
            {isOpen ? <ChevronDown className="shrink-0" size={19} /> : <ChevronRight className="shrink-0" size={19} />}
          </button>

          {isOpen && <div className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {section.production_tasks.map((task, taskIndex) => {
              const statusView = taskStatusPresentation[task.status];
              const hiddenOnMobile = filter === "focus" && taskIndex >= 6;

              return <div
                key={task.id}
                className={`${statusView.rowClass} px-4 py-4 transition sm:px-5 ${hiddenOnMobile ? "hidden sm:block" : ""}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      aria-label={`${task.title} ${task.status === "done" ? "wieder öffnen" : "erledigen"}`}
                      onClick={() => taskStatus.mutate({
                        taskId: task.id,
                        status: task.status === "done" ? "open" : "done"
                      })}
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${
                        task.status === "done"
                          ? "border-moss-600 bg-moss-600 text-white"
                          : task.status === "blocked"
                            ? "border-red-400 text-red-600"
                            : task.status === "in_progress"
                              ? "border-blue-500 bg-blue-100 text-blue-700"
                              : task.status === "skipped"
                                ? "border-black/20 bg-black/[0.06] text-black/40"
                                : "border-black/20 text-black/25 hover:border-moss-500"
                      }`}
                    ><TaskStatusIcon status={task.status} /></button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold leading-5 ${statusView.titleClass}`}>{task.title}</p>
                        <Badge tone={statusView.tone}>{statusView.label}</Badge>
                        <Badge tone={task.is_required ? "blue" : "neutral"}>{task.is_required ? "Pflicht" : "Optional"}</Badge>
                        {task.origin === "custom" && <Badge tone="amber">Individuell</Badge>}
                      </div>
                      {task.hint && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{task.hint}</div>}

                      {task.production_subtasks.length > 0 && <div className="mt-3 grid gap-2">
                        {task.production_subtasks.map((subtask) => <div
                          key={subtask.id}
                          className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/[0.04]"
                        >
                          <button
                            type="button"
                            aria-label={`Unterpunkt ${subtask.title} umschalten`}
                            onClick={() => subtaskStatus.mutate({
                              subtaskId: subtask.id,
                              status: subtask.status === "done" ? "open" : "done"
                            })}
                            className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${
                              subtask.status === "done"
                                ? "border-moss-500 bg-moss-500 text-white"
                                : "border-black/20"
                            }`}
                          >{subtask.status === "done" && <Check size={11} />}</button>
                          <div className="min-w-0 flex-1 text-xs">
                            <span className={subtask.status === "done" ? "text-black/35 line-through" : ""}>{subtask.title}</span>
                            {subtask.timecode && <span className="ml-2 rounded bg-white px-1.5 py-0.5 font-mono font-bold text-moss-700">{subtask.timecode}</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            aria-label={`Unterpunkt ${subtask.title} bearbeiten`}
                            onClick={() => {
                              setEditTarget({ type: "subtask", id: subtask.id, title: subtask.title });
                              setEntryTitle(subtask.title);
                            }}
                          ><Pencil size={13} /></Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-red-600"
                            aria-label={`Unterpunkt ${subtask.title} löschen`}
                            onClick={async () => {
                              if (confirm(`Unterpunkt „${subtask.title}“ aus dieser Produktion löschen?`)) {
                                await deleteProductionSubtask(subtask.id);
                                await invalidate();
                              }
                            }}
                          ><Trash2 size={13} /></Button>
                        </div>)}
                      </div>}

                      {task.production_quality_checks.length > 0 && <div className="mt-3 rounded-xl bg-moss-50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-moss-700">Prüfpunkte</p>
                        {task.production_quality_checks.map((check) => <label key={check.id} className="flex min-h-8 items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={check.is_completed}
                            onChange={() => checkMutation.mutate({ checkId: check.id, value: !check.is_completed })}
                            className="size-4 accent-moss-600"
                          />
                          {check.title}
                        </label>)}
                      </div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pl-9 sm:shrink-0 sm:pl-0">
                    <select
                      aria-label={`Status für ${task.title}`}
                      value={task.status}
                      onChange={(event) => taskStatus.mutate({
                        taskId: task.id,
                        status: event.target.value as TaskStatus
                      })}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold sm:max-w-32"
                    >
                      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => {
                        setQuickType(task.task_type);
                        setTargetTask(task.id);
                      }}
                      aria-label={`Unterpunkt zu ${task.title} hinzufügen`}
                    ><CirclePlus size={16} /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={`Aufgabe ${task.title} bearbeiten`}
                      onClick={() => {
                        setEditTarget({ type: "task", id: task.id, title: task.title });
                        setEntryTitle(task.title);
                      }}
                    ><Pencil size={15} /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-red-600"
                      aria-label={`Aufgabe ${task.title} löschen`}
                      onClick={async () => {
                        if (confirm(`Aufgabe „${task.title}“ samt Unterpunkten aus dieser Produktion löschen?`)) {
                          await deleteProductionTask(task.id);
                          await invalidate();
                        }
                      }}
                    ><Trash2 size={15} /></Button>
                  </div>
                </div>
              </div>;
            })}

            {filter === "focus" && focusTaskCount > 6 && <div className="border-t border-blue-100 bg-blue-50/50 px-4 py-3 text-xs text-blue-900 sm:hidden">
              Weitere {focusTaskCount - 6} Aufgaben dieses Bereichs sind ausgeblendet.
              <button type="button" className="ml-1 font-bold underline" onClick={() => setFilter("all")}>Alle Bereiche öffnen</button>
            </div>}

            <button
              type="button"
              onClick={() => {
                setNewTaskSection(section.id);
                setEntryTitle("");
              }}
              className="flex w-full items-center gap-2 border-t border-black/[0.06] px-4 py-3 text-sm font-bold text-moss-700 hover:bg-moss-50 sm:px-5"
            ><Plus size={16} />Aufgabe hinzufügen</button>
          </div>}
        </Card>;
      })}
    </div>

    {sections.length === 0 && <Notice tone="success">
      Für diesen Filter gibt es keine Aufgaben. Wähle „Alle Bereiche“, um die vollständige Produktion zu sehen.
    </Notice>}

    <Card className="p-4 sm:p-5">
      <Field label="Produktionsnotizen" hint="Wird beim Verlassen des Feldes gespeichert.">
        <textarea
          defaultValue={production.notes}
          onBlur={(event) => {
            if (event.target.value !== production.notes) {
              void updateProduction(id, { notes: event.target.value }).then(invalidate);
            }
          }}
          className="min-h-28 w-full resize-y rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-moss-500"
          placeholder="Besonderheiten, offene Fragen oder Learnings …"
        />
      </Field>
    </Card>

    {quickType && <Modal
      title={quickType === "edit_point" ? "Schnittpunkt hinzufügen" : "Unterpunkt hinzufügen"}
      onClose={() => {
        setQuickType(null);
        setError("");
      }}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        void addQuick();
      }} className="grid gap-4">
        {quickType === "edit_point" && <Field
          label="Zeitcode"
          error={error && timecode ? error : undefined}
          hint="12:43 oder 1:12:43"
        >
          <Input autoFocus value={timecode} onChange={(event) => setTimecode(event.target.value)} placeholder="12:43" />
        </Field>}
        <Field label="Beschreibung" error={error && !timecode ? error : undefined}>
          <Input
            autoFocus={quickType !== "edit_point"}
            required
            value={entryTitle}
            onChange={(event) => setEntryTitle(event.target.value)}
            placeholder="Was ist zu tun?"
          />
        </Field>
        {!targetTask && !allTasks.some((task) => task.task_type === quickType) && <Field label="Zielaufgabe">
          <select
            required
            value={targetTask ?? ""}
            onChange={(event) => setTargetTask(event.target.value)}
            className="min-h-11 rounded-xl border border-black/10 px-3"
          >
            <option value="">Aufgabe wählen …</option>
            {allTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </Field>}
        {error && !timecode && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={!entryTitle.trim()}>Hinzufügen</Button>
      </form>
    </Modal>}

    {newTaskSection && <Modal title="Individuelle Aufgabe" onClose={() => setNewTaskSection(null)}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        await addProductionTask({ sectionId: newTaskSection, title: entryTitle });
        setNewTaskSection(null);
        setEntryTitle("");
        await invalidate();
      }} className="grid gap-4">
        <Field label="Aufgabentitel">
          <Input autoFocus required value={entryTitle} onChange={(event) => setEntryTitle(event.target.value)} />
        </Field>
        <Notice>Individuelle Aufgaben werden als Nutzungssignal für spätere Lernvorschläge erfasst.</Notice>
        <Button type="submit" disabled={!entryTitle.trim()}>Aufgabe hinzufügen</Button>
      </form>
    </Modal>}

    {editTarget && <Modal
      title={editTarget.type === "task" ? "Aufgabe bearbeiten" : "Unterpunkt bearbeiten"}
      onClose={() => setEditTarget(null)}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        void saveEdit();
      }} className="grid gap-4">
        <Field label={editTarget.type === "task" ? "Aufgabentitel" : "Unterpunkt"}>
          <Input autoFocus required value={entryTitle} onChange={(event) => setEntryTitle(event.target.value)} />
        </Field>
        <Notice>Die Änderung gilt für diese Produktion und wird in der Lernhistorie erfasst.</Notice>
        <Button type="submit" disabled={!entryTitle.trim()}>Änderung speichern</Button>
      </form>
    </Modal>}

    {deleteOpen && <Modal title="Produktion löschen" onClose={() => {
      if (!deleteMutation.isPending) setDeleteOpen(false);
    }}>
      <div className="grid gap-4">
        <Notice tone="error">
          Diese Produktion wird endgültig gelöscht – zusammen mit allen Aufgaben, Unterpunkten und Notizen.
        </Notice>
        <p className="text-sm text-black/60">
          Möchtest du <strong className="text-ink">{production.working_title || "diese Produktion"}</strong> wirklich löschen?
        </p>
        {deleteMutation.error && <Notice tone="error">{humanizeError(deleteMutation.error)}</Notice>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" disabled={deleteMutation.isPending} onClick={() => setDeleteOpen(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            <Trash2 size={16} />{deleteMutation.isPending ? "Wird gelöscht …" : "Endgültig löschen"}
          </Button>
        </div>
      </div>
    </Modal>}
  </div>;
}
