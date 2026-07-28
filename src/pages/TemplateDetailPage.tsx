import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, CirclePlus, History, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Field, Input, Modal, Notice } from "../components/ui";
import {
  addTemplateSection, addTemplateTask, deleteTemplateSection, deleteTemplateTask,
  duplicateTemplateVersion, getTemplate, swapTemplateSectionPositions,
  swapTemplateTaskPositions, updateTemplateTask
} from "../features/data/api";
import { humanizeError } from "../lib/utils";

export function TemplateDetailPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["template", id], queryFn: () => getTemplate(id), enabled: Boolean(id) });
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState(false);
  const invalidate = async () => { await client.invalidateQueries({ queryKey: ["template", id] }); await client.invalidateQueries({ queryKey: ["templates"] }); };
  const versionMutation = useMutation({
    mutationFn: () => duplicateTemplateVersion(id, summary || "Vorlage bearbeitet"),
    onSuccess: async () => { setEditing(true); setSummary(""); await invalidate(); }
  });
  const taskMutation = useMutation({
    mutationFn: () => addTemplateTask(newTaskSection!, newTitle, true),
    onSuccess: async () => { setNewTaskSection(null); setNewTitle(""); await invalidate(); }
  });
  const sectionMutation = useMutation({
    mutationFn: () => addTemplateSection(query.data.current_version_id, newTitle),
    onSuccess: async () => { setNewSection(false); setNewTitle(""); await invalidate(); }
  });
  if (query.isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  if (!query.data) return <Notice tone="error">Vorlage konnte nicht geladen werden.</Notice>;
  const version = [...query.data.template_versions].sort((a:any,b:any) => b.version_number-a.version_number)[0];
  return <div className="grid gap-6">
    <Link to="/templates" className="inline-flex items-center gap-2 text-sm font-semibold text-black/45 hover:text-ink"><ArrowLeft size={16} />Alle Vorlagen</Link>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge tone="green">{query.data.formats?.name}</Badge><Badge>Version {version?.version_number}</Badge></div><h2 className="mt-3 font-display text-3xl font-extrabold">{query.data.name}</h2><p className="mt-2 text-sm text-black/45">{query.data.description}</p></div>{editing ? <Button variant="secondary" onClick={() => setEditing(false)}><Save size={17} />Bearbeitung abschließen</Button> : <Button onClick={() => setSummary("Workflow aktualisiert")}><History size={17} />Neue Version bearbeiten</Button>}</div>
    {!editing && <Notice>Änderungen gelten nur für Produktionen, die künftig mit der neuen Vorlagenversion erstellt werden. Bestehende Produktionen bleiben unverändert.</Notice>}
    {editing && <Notice tone="success">Du bearbeitest Version {version?.version_number}. Änderungen werden sofort gespeichert.</Notice>}
    <div className="grid gap-4">{query.data.sections.map((section:any, sectionIndex:number) => <Card key={section.id} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4"><div><h3 className="font-display font-bold">{section.title}</h3><p className="mt-0.5 text-xs text-black/35">{section.template_tasks.length} Aufgaben</p></div><div className="flex items-center gap-1">{editing && <><Button disabled={sectionIndex === 0} variant="ghost" size="icon" aria-label="Bereich nach oben" onClick={async () => { await swapTemplateSectionPositions(section, query.data.sections[sectionIndex-1]); await invalidate(); }}><ChevronUp size={17} /></Button><Button disabled={sectionIndex === query.data.sections.length-1} variant="ghost" size="icon" aria-label="Bereich nach unten" onClick={async () => { await swapTemplateSectionPositions(section, query.data.sections[sectionIndex+1]); await invalidate(); }}><ChevronDown size={17} /></Button><Button variant="ghost" size="icon" aria-label="Bereich löschen" onClick={async () => { if (confirm(`Bereich „${section.title}“ samt Aufgaben löschen?`)) { await deleteTemplateSection(section.id); await invalidate(); } }}><Trash2 size={17} /></Button></>}</div></div>
      <div className="divide-y divide-black/[0.05]">{section.template_tasks.map((task:any, taskIndex:number) => <div key={task.id} className="flex items-start gap-3 px-5 py-3.5">
        <div className="mt-1 size-4 shrink-0 rounded border-2 border-black/15" />
        <div className="min-w-0 flex-1">{editing ? <Input defaultValue={task.title} className="min-h-9" onBlur={async (event) => { if (event.target.value.trim() && event.target.value !== task.title) { await updateTemplateTask(task.id,{title:event.target.value.trim()}); await invalidate(); } }} /> : <p className="text-sm font-medium">{task.title}</p>}{task.hint && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{task.hint}</p>}{task.template_quality_checks?.length > 0 && <p className="mt-2 text-xs text-black/35">{task.template_quality_checks.length} Qualitätschecks</p>}</div>
        <Badge tone={task.is_required ? "blue" : "neutral"}>{task.is_required ? "Pflicht" : "Optional"}</Badge>
        {editing && <div className="flex"><Button disabled={taskIndex === 0} variant="ghost" size="icon" aria-label="Aufgabe nach oben" onClick={async () => { await swapTemplateTaskPositions(task,section.template_tasks[taskIndex-1]); await invalidate(); }}><ChevronUp size={15} /></Button><Button disabled={taskIndex === section.template_tasks.length-1} variant="ghost" size="icon" aria-label="Aufgabe nach unten" onClick={async () => { await swapTemplateTaskPositions(task,section.template_tasks[taskIndex+1]); await invalidate(); }}><ChevronDown size={15} /></Button><Button variant="ghost" size="icon" aria-label="Aufgabe löschen" onClick={async () => { if(confirm(`Aufgabe „${task.title}“ löschen?`)){ await deleteTemplateTask(task.id); await invalidate(); } }}><Trash2 size={16} /></Button></div>}
      </div>)}</div>
      {editing && <button onClick={() => { setNewTaskSection(section.id); setNewTitle(""); }} className="flex w-full items-center gap-2 border-t border-black/[0.06] px-5 py-3 text-sm font-bold text-moss-700 hover:bg-moss-50"><Plus size={16} />Aufgabe hinzufügen</button>}
    </Card>)}</div>
    {editing && <Button variant="secondary" onClick={() => { setNewSection(true); setNewTitle(""); }} className="justify-self-start"><CirclePlus size={17} />Bereich hinzufügen</Button>}

    {!editing && summary && <Modal title="Neue Vorlagenversion" onClose={() => setSummary("")}><div className="grid gap-4"><Field label="Änderungszusammenfassung"><Input autoFocus value={summary} onChange={(event) => setSummary(event.target.value)} /></Field><Notice>Die aktuelle Version wird kopiert. Danach kannst du die neue Version unabhängig bearbeiten.</Notice>{versionMutation.error && <Notice tone="error">{humanizeError(versionMutation.error)}</Notice>}<Button onClick={() => versionMutation.mutate()} disabled={versionMutation.isPending}>Version erstellen</Button></div></Modal>}
    {newTaskSection && <Modal title="Aufgabe hinzufügen" onClose={() => setNewTaskSection(null)}><form onSubmit={(e) => {e.preventDefault();taskMutation.mutate();}} className="grid gap-4"><Field label="Aufgabentitel"><Input autoFocus required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></Field><Button type="submit" disabled={!newTitle.trim() || taskMutation.isPending}>Aufgabe hinzufügen</Button></form></Modal>}
    {newSection && <Modal title="Bereich hinzufügen" onClose={() => setNewSection(false)}><form onSubmit={(e) => {e.preventDefault();sectionMutation.mutate();}} className="grid gap-4"><Field label="Bereichstitel"><Input autoFocus required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></Field><Button type="submit" disabled={!newTitle.trim() || sectionMutation.isPending}>Bereich hinzufügen</Button></form></Modal>}
  </div>;
}
