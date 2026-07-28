import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarDays, Lightbulb, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, EmptyState } from "../components/ui";
import { listProductions, listSuggestions } from "../features/data/api";
import { ProductionCard } from "../features/productions/ProductionCard";
import { sortProductions } from "../lib/dates";

export function DashboardPage() {
  const productions = useQuery({ queryKey: ["productions"], queryFn: listProductions });
  const suggestions = useQuery({ queryKey: ["suggestions"], queryFn: listSuggestions });
  const today = new Date().toISOString().slice(0, 10);
  const sorted = sortProductions(productions.data ?? []);
  const overdue = sorted.filter((item) => item.planned_publish_date < today && !["published", "archived"].includes(item.status));
  const next = sorted.find((item) => !["published", "archived"].includes(item.status));
  return <div className="grid gap-8">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="flex items-center gap-2 text-sm font-bold text-moss-600"><Sparkles size={16} />Produktionszentrale</div><h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Was steht als Nächstes an?</h2><p className="mt-2 text-sm text-black/45">Alles Wichtige für deine laufende Postproduktion.</p></div>
      <Link to="/productions/new"><Button><Plus size={17} />Produktion planen</Button></Link>
    </section>

    {productions.isLoading ? <div className="h-56 animate-pulse rounded-2xl bg-white" /> : !next ?
      <EmptyState icon={CalendarDays} title="Noch keine Produktion geplant" description="Erstelle deine erste Produktion aus einer Standardvorlage. Alle Arbeitsschritte werden automatisch kopiert." action={<Link to="/productions/new"><Button>Erste Produktion anlegen</Button></Link>} /> :
      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <div><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Nächste Produktion</h2><Link to="/productions" className="text-xs font-bold text-moss-700">Alle ansehen</Link></div><ProductionCard production={next} detailed /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="flex items-center gap-4 p-5"><div className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-600"><AlertTriangle size={20} /></div><div><p className="font-display text-2xl font-extrabold">{overdue.length}</p><p className="text-xs font-medium text-black/45">überfällige Produktionen</p></div></Card>
          <Card className="flex items-center gap-4 p-5"><div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Lightbulb size={20} /></div><div><p className="font-display text-2xl font-extrabold">{suggestions.data?.length ?? 0}</p><p className="text-xs font-medium text-black/45">offene Lernvorschläge</p></div></Card>
        </div>
      </section>}

    <section>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Diese Woche & demnächst</h2><Link to="/productions" className="flex items-center gap-1 text-xs font-bold text-moss-700">Produktion suchen <ArrowRight size={14} /></Link></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sorted.slice(0, 6).map((production) => <ProductionCard key={production.id} production={production} />)}</div>
    </section>
    {overdue.length > 0 && <Card className="flex flex-col gap-4 border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><Badge tone="red">Aufmerksamkeit</Badge><p className="mt-2 text-sm font-semibold">{overdue.length === 1 ? "Eine Produktion ist überfällig." : `${overdue.length} Produktionen sind überfällig.`}</p></div><Link to="/productions"><Button variant="secondary" size="sm">Prioritäten prüfen</Button></Link></Card>}
  </div>;
}
