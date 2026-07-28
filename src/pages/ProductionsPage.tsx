import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, Input } from "../components/ui";
import { listProductions } from "../features/data/api";
import { ProductionCard } from "../features/productions/ProductionCard";
import { sortProductions } from "../lib/dates";

export function ProductionsPage() {
  const query = useQuery({ queryKey: ["productions"], queryFn: listProductions });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => sortProductions((query.data ?? []).filter((item) => {
    const matchText = `${item.working_title} ${item.final_title} ${item.notes}`.toLowerCase().includes(search.toLowerCase());
    return matchText && (status === "all" || item.status === status);
  })), [query.data, search, status]);
  return <div className="grid gap-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-3xl font-extrabold">Produktionen</h2><p className="mt-2 text-sm text-black/45">Plane, bearbeite und archiviere alle Folgen.</p></div><Link to="/productions/new"><Button><Plus size={17} />Neue Produktion</Button></Link></div>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3.5 top-3.5 text-black/30" size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="Titel oder Notizen durchsuchen …" /></div><label className="relative"><Filter className="pointer-events-none absolute left-3.5 top-3.5 text-black/30" size={17} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 min-w-52 appearance-none rounded-xl border border-black/10 bg-white pl-10 pr-8 text-sm font-medium"><option value="all">Alle Status</option><option value="planned">Geplant</option><option value="editing">Im Schnitt</option><option value="quality_control">Qualitätskontrolle</option><option value="ready">Bereit</option><option value="published">Veröffentlicht</option></select></label></div>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-60 animate-pulse rounded-2xl bg-white" />)}</div> : filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <ProductionCard detailed key={item.id} production={item} />)}</div> : <EmptyState icon={CalendarDays} title="Keine Produktionen gefunden" description={search || status !== "all" ? "Passe Suche oder Filter an." : "Plane deine erste Folge aus einer Vorlage."} />}
  </div>;
}
