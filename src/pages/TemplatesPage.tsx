import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Copy, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Notice } from "../components/ui";
import { listTemplates } from "../features/data/api";

export function TemplatesPage() {
  const query = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  return <div className="grid gap-7">
    <div><div className="flex items-center gap-2 text-sm font-bold text-moss-600"><Layers3 size={16} />Standard-Workflows</div><h2 className="mt-2 font-display text-3xl font-extrabold">Vorlagen</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">Änderungen erzeugen eine neue Version und gelten nur für künftige Produktionen.</p></div>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-white" />)}</div> : query.isError ? <Notice tone="error"><div className="grid gap-3"><p>Vorlagen konnten nicht geladen werden.</p><Button type="button" variant="secondary" size="sm" onClick={() => query.refetch()}>Erneut versuchen</Button></div></Notice> : query.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.map((template) => <Card key={template.id} className="group p-6">
      <div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-xl bg-moss-100 text-moss-700"><BookOpenCheck size={21} /></div><Badge tone="green">Version {template.template_versions?.[0]?.version_number ?? 1}</Badge></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-black/35">{template.formats?.name}</p><h3 className="mt-1 font-display text-xl font-extrabold">{template.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-black/45">{template.description}</p>
      <div className="mt-6 flex items-center justify-between border-t border-black/[0.06] pt-4"><span className="flex items-center gap-2 text-xs font-semibold text-black/40"><Copy size={14} />Versioniert</span><Link to={`/templates/${template.id}`} className="flex items-center gap-1.5 text-sm font-bold text-moss-700">Öffnen <ArrowRight size={15} /></Link></div>
    </Card>)}</div> : <EmptyState icon={BookOpenCheck} title="Noch keine Vorlagen" description="Deine Standardvorlagen werden beim ersten Login automatisch angelegt. Lade die Seite gleich noch einmal." />}
  </div>;
}
