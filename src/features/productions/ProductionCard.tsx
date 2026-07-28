import { ArrowRight, Calendar, CheckCircle2, Clock3, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, Progress } from "../../components/ui";
import { calculateProgress } from "../../lib/progress";
import { formatDate } from "../../lib/utils";
import type { Production } from "../../types/domain";

const statusLabels: Record<string, string> = {
  planned: "Geplant", prepared: "Vorbereitet", in_production: "In Produktion",
  editing: "Im Schnitt", quality_control: "Qualitätskontrolle", ready: "Bereit",
  published: "Veröffentlicht", archived: "Archiviert"
};

export function ProductionCard({ production, detailed = false }: { production: Production; detailed?: boolean }) {
  const progress = calculateProgress(production);
  const overdue = production.planned_publish_date < new Date().toISOString().slice(0, 10) &&
    !["published", "archived"].includes(production.status);
  return <Card className="group p-5 transition hover:-translate-y-0.5 hover:border-moss-400/40 hover:shadow-xl sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><Badge tone={overdue ? "red" : "green"}>{production.formats?.name ?? "Format"}</Badge><Badge>{statusLabels[production.status]}</Badge></div>
        <h3 className="mt-3 truncate font-display text-lg font-extrabold">{production.working_title || "Unbenannte Produktion"}</h3>
      </div>
      <Link to={`/productions/${production.id}`} className="grid size-9 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-black/40 transition group-hover:bg-moss-600 group-hover:text-white" aria-label="Produktion öffnen"><ArrowRight size={17} /></Link>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-black/50">
      <div className="flex items-center gap-2"><Calendar size={15} />Produktion: {formatDate(production.production_date, { day: "2-digit", month: "short" })}</div>
      <div className="flex items-center gap-2"><Clock3 size={15} />Release: {formatDate(production.planned_publish_date, { day: "2-digit", month: "short" })}</div>
    </div>
    <div className="mt-5"><Progress value={progress.total} label="Fortschritt" /></div>
    {detailed && <div className="mt-4 flex flex-wrap gap-4 border-t border-black/[0.06] pt-4 text-xs font-medium text-black/45"><span className="flex items-center gap-1.5"><CheckCircle2 size={14} />{progress.open} Aufgaben offen</span><span className="flex items-center gap-1.5"><Scissors size={14} />{progress.openEditPoints} Schnittpunkte</span></div>}
  </Card>;
}
