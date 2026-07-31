import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronDown, ChevronRight, ChevronUp, CirclePlus,
  History, ListTree, Plus, Save, Search, Trash2
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Field, Input, Modal, Notice } from "../components/ui";
import {
  addTemplateSection, addTemplateSubtask, addTemplateTask,
  deleteTemplateSection, deleteTemplateSubtask, deleteTemplateTask,
  duplicateTemplateVersion, getTemplate, swapTemplateSectionPositions,
  swapTemplateTaskPositions, updateTemplateSubtask, updateTemplateTask
} from "../features/data/api";
import { humanizeError } from "../lib/utils";

export function TemplateDetailPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate(id),
    enabled: Boolean(id)
  });
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null);
  const [newSubtaskTask, setNewSubtaskTask] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState(false);

  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["template", id] });
    await client.invalidateQueries({ queryKey: ["templates"] });
  };
  const versionMutation = useMutation({
    mutationFn: () => duplicateTemplateVersion(id, summary || "Vorlage bearbeitet"),
    onSuccess: async () => {
      setEditing(true);
      setSummary("");
      await invalidate();
    }
  });
  const taskMutation = useMutation({
    mutationFn: () => addTemplateTask(newTaskSection!, newTitle, true),
    onSuccess: async () => {
      setNewTaskSection(null);
      setNewTitle("");
      await invalidate();
    }
  });
  const subtaskMutation = useMutation({
    mutationFn: () => addTemplateSubtask(newSubtaskTask!, newTitle),
    onSuccess: async () => {
      setNewSubtaskTask(null);
      setNewTitle("");
      await invalidate();
    }
  });
  const sectionMutation = useMutation({
    mutationFn: () => addTemplateSection(query.data.current_version_id, newTitle),
    onSuccess: async () => {
      setNewSection(false);
      setNewTitle("");
      await invalidate();
    }
  });

  if (query.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  if (!query.data) return <Notice tone="error">Vorlage konnte nicht geladen werden.</Notice>;

  const version = [...query.data.template_versions]
    .sort((a: any, b: any) => b.version_number - a.version_number)[0];
  const normalizedSearch = search.trim().toLowerCase();
  const toggleSection = (sectionId: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return <div className="grid gap-5 sm:gap-6">
    <Link to="/templates" className="inline-flex items-center gap-2 text-sm font-semibold text-black/45 hover:text-ink">
      <ArrowLeft size={16} />Alle Vorlagen
    </Link>

    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{query.data.formats?.name}</Badge>
          <Badge>Version {version?.version_number}</Badge>
        </div>
        <h2 className="mt-3 font-display text-3xl font-extrabold">{query.data.name}</h2>
        <p className="mt-2 text-sm text-black/45">{query.data.description}</p>
      </div>
      {editing
        ? <Button variant="secondary" onClick={() => setEditing(false)}><Save size={17} />Bearbeitung abschließen</Button>
        : <Button onClick={() => setSummary("Workflow aktualisiert")}><History size={17} />Neue Version bearbeiten</Button>}
    </div>

    {!editing && <Notice>
      Die Bereiche sind bewusst eingeklappt. Öffne nur den Teil, den du ansehen möchtest.
      Änderungen gelten ausschließlich für zukünftige Produktionen.
    </Notice>}
    {editing && <Notice tone="success">
      Du bearbeitest Version {version?.version_number}. Aufgaben und Unterpunkte werden sofort gespeichert.
    </Notice>}

    <div className="relative">
      <Search className="absolute left-3.5 top-3.5 text-black/30" size={17} />
      <Input
        className="pl-10"
        placeholder="Aufgaben und Unterpunkte durchsuchen …"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </div>

    <div className="grid gap-3 sm:gap-4">
      {query.data.sections.map((section: any, sectionIndex: number) => {
        const visibleTasks = section.template_tasks.filter((task: any) => {
          const text = [
            task.title,
            task.hint,
            ...(task.template_subtasks ?? []).map((subtask: any) => subtask.title)
          ].join(" ").toLowerCase();
          return text.includes(normalizedSearch);
        });
        const isOpen = normalizedSearch ? visibleTasks.length > 0 : openSections.has(section.id);

        return <Card key={section.id} className="overflow-hidden">
          <div className="flex items-center border-b border-black/[0.06]">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left sm:px-5"
            >
              {isOpen ? <ChevronDown className="shrink-0" size={19} /> : <ChevronRight className="shrink-0" size={19} />}
              <div className="min-w-0">
                <h3 className="truncate font-display font-bold">{section.title}</h3>
                <p className="mt-0.5 text-xs text-black/35">
                  {section.template_tasks.length} Aufgaben
                  {visibleTasks.reduce((total: number, task: any) => total + (task.template_subtasks?.length ?? 0), 0) > 0
                    ? ` · ${visibleTasks.reduce((total: number, task: any) => total + (task.template_subtasks?.length ?? 0), 0)} Unterpunkte`
                    : ""}
                </p>
              </div>
            </button>
            {editing && <div className="flex shrink-0 items-center pr-2 sm:pr-3">
              <Button
                disabled={sectionIndex === 0}
                variant="ghost"
                size="icon"
                aria-label="Bereich nach oben"
                onClick={async () => {
                  await swapTemplateSectionPositions(section, query.data.sections[sectionIndex - 1]);
                  await invalidate();
                }}
              ><ChevronUp size={17} /></Button>
              <Button
                disabled={sectionIndex === query.data.sections.length - 1}
                variant="ghost"
                size="icon"
                aria-label="Bereich nach unten"
                onClick={async () => {
                  await swapTemplateSectionPositions(section, query.data.sections[sectionIndex + 1]);
                  await invalidate();
                }}
              ><ChevronDown size={17} /></Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Bereich löschen"
                onClick={async () => {
                  if (confirm(`Bereich „${section.title}“ samt Aufgaben löschen?`)) {
                    await deleteTemplateSection(section.id);
                    await invalidate();
                  }
                }}
              ><Trash2 size={17} /></Button>
            </div>}
          </div>

          {isOpen && <div className="divide-y divide-black/[0.05]">
            {visibleTasks.map((task: any, taskIndex: number) => <div key={task.id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-1 size-4 shrink-0 rounded border-2 border-black/15" />
                  <div className="min-w-0 flex-1">
                    {editing
                      ? <Input
                        defaultValue={task.title}
                        className="min-h-9"
                        onBlur={async (event) => {
                          if (event.target.value.trim() && event.target.value !== task.title) {
                            await updateTemplateTask(task.id, { title: event.target.value.trim() });
                            await invalidate();
                          }
                        }}
                      />
                      : <p className="text-sm font-semibold">{task.title}</p>}
                    {task.hint && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{task.hint}</p>}

                    {(task.template_subtasks?.length > 0 || editing) && <div className="mt-3 grid gap-2">
                      {task.template_subtasks?.map((subtask: any) => <div
                        key={subtask.id}
                        className="flex items-center gap-2 rounded-lg bg-black/[0.025] px-3 py-2"
                      >
                        <ListTree className="shrink-0 text-black/30" size={14} />
                        {editing
                          ? <Input
                            defaultValue={subtask.title}
                            className="min-h-8 flex-1 text-xs"
                            onBlur={async (event) => {
                              if (event.target.value.trim() && event.target.value !== subtask.title) {
                                await updateTemplateSubtask(subtask.id, { title: event.target.value.trim() });
                                await invalidate();
                              }
                            }}
                          />
                          : <span className="min-w-0 flex-1 text-xs">{subtask.title}</span>}
                        {editing && <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          aria-label={`Unterpunkt ${subtask.title} löschen`}
                          onClick={async () => {
                            if (confirm(`Unterpunkt „${subtask.title}“ löschen?`)) {
                              await deleteTemplateSubtask(subtask.id);
                              await invalidate();
                            }
                          }}
                        ><Trash2 size={14} /></Button>}
                      </div>)}
                      {editing && <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-moss-700 hover:bg-moss-50"
                        onClick={() => {
                          setNewSubtaskTask(task.id);
                          setNewTitle("");
                        }}
                      ><CirclePlus size={15} />Unterpunkt hinzufügen</button>}
                    </div>}

                    {task.template_quality_checks?.length > 0 && <p className="mt-2 text-xs text-black/35">
                      {task.template_quality_checks.length} Prüfpunkte
                    </p>}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pl-7 sm:justify-end sm:pl-0">
                  <Badge tone={task.is_required ? "blue" : "neutral"}>{task.is_required ? "Pflicht" : "Optional"}</Badge>
                  {editing && <div className="flex">
                    <Button
                      disabled={taskIndex === 0}
                      variant="ghost"
                      size="icon"
                      aria-label="Aufgabe nach oben"
                      onClick={async () => {
                        await swapTemplateTaskPositions(task, visibleTasks[taskIndex - 1]);
                        await invalidate();
                      }}
                    ><ChevronUp size={15} /></Button>
                    <Button
                      disabled={taskIndex === visibleTasks.length - 1}
                      variant="ghost"
                      size="icon"
                      aria-label="Aufgabe nach unten"
                      onClick={async () => {
                        await swapTemplateTaskPositions(task, visibleTasks[taskIndex + 1]);
                        await invalidate();
                      }}
                    ><ChevronDown size={15} /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Aufgabe löschen"
                      onClick={async () => {
                        if (confirm(`Aufgabe „${task.title}“ löschen?`)) {
                          await deleteTemplateTask(task.id);
                          await invalidate();
                        }
                      }}
                    ><Trash2 size={16} /></Button>
                  </div>}
                </div>
              </div>
            </div>)}
          </div>}

          {editing && isOpen && <button
            type="button"
            onClick={() => {
              setNewTaskSection(section.id);
              setNewTitle("");
            }}
            className="flex w-full items-center gap-2 border-t border-black/[0.06] px-4 py-3 text-sm font-bold text-moss-700 hover:bg-moss-50 sm:px-5"
          ><Plus size={16} />Aufgabe hinzufügen</button>}
        </Card>;
      })}
    </div>

    {editing && <Button
      variant="secondary"
      onClick={() => {
        setNewSection(true);
        setNewTitle("");
      }}
      className="justify-self-start"
    ><CirclePlus size={17} />Bereich hinzufügen</Button>}

    {!editing && summary && <Modal title="Neue Vorlagenversion" onClose={() => setSummary("")}>
      <div className="grid gap-4">
        <Field label="Änderungszusammenfassung">
          <Input autoFocus value={summary} onChange={(event) => setSummary(event.target.value)} />
        </Field>
        <Notice>Die aktuelle Version wird kopiert. Danach kannst du die neue Version unabhängig bearbeiten.</Notice>
        {versionMutation.error && <Notice tone="error">{humanizeError(versionMutation.error)}</Notice>}
        <Button onClick={() => versionMutation.mutate()} disabled={versionMutation.isPending}>Version erstellen</Button>
      </div>
    </Modal>}

    {newTaskSection && <Modal title="Aufgabe hinzufügen" onClose={() => setNewTaskSection(null)}>
      <form onSubmit={(event) => {
        event.preventDefault();
        taskMutation.mutate();
      }} className="grid gap-4">
        <Field label="Aufgabentitel">
          <Input autoFocus required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
        </Field>
        <Button type="submit" disabled={!newTitle.trim() || taskMutation.isPending}>Aufgabe hinzufügen</Button>
      </form>
    </Modal>}

    {newSubtaskTask && <Modal title="Unterpunkt hinzufügen" onClose={() => setNewSubtaskTask(null)}>
      <form onSubmit={(event) => {
        event.preventDefault();
        subtaskMutation.mutate();
      }} className="grid gap-4">
        <Field label="Unterpunkt">
          <Input autoFocus required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
        </Field>
        <Button type="submit" disabled={!newTitle.trim() || subtaskMutation.isPending}>Unterpunkt hinzufügen</Button>
      </form>
    </Modal>}

    {newSection && <Modal title="Bereich hinzufügen" onClose={() => setNewSection(false)}>
      <form onSubmit={(event) => {
        event.preventDefault();
        sectionMutation.mutate();
      }} className="grid gap-4">
        <Field label="Bereichstitel">
          <Input autoFocus required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
        </Field>
        <Button type="submit" disabled={!newTitle.trim() || sectionMutation.isPending}>Bereich hinzufügen</Button>
      </form>
    </Modal>}
  </div>;
}
