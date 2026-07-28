import { Copy, Database, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button, Card, Notice } from "../components/ui";

export function ConfigurationPage() {
  const [copied, setCopied] = useState(false);
  const env = "VITE_SUPABASE_URL=https://dein-projekt.supabase.co\nVITE_SUPABASE_ANON_KEY=dein-publishable-key";
  async function copy() { await navigator.clipboard.writeText(env); setCopied(true); }
  return <div className="grid min-h-screen place-items-center bg-paper px-5 py-10">
    <Card className="w-full max-w-2xl overflow-hidden">
      <div className="bg-ink p-7 text-white sm:p-10"><div className="grid size-12 place-items-center rounded-2xl bg-sun text-ink"><Database /></div><h1 className="mt-6 font-display text-3xl font-extrabold">Noch mit Supabase verbinden</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Die App ist bereit. Für Login und sichere Datenspeicherung fehlen nur die beiden öffentlichen Projektwerte.</p></div>
      <div className="p-6 sm:p-10">
        <Notice>Lege lokal eine <code>.env</code>-Datei an. Im GitHub-Workflow werden dieselben Werte als Repository Variables gelesen.</Notice>
        <pre className="mt-5 overflow-auto rounded-xl bg-black/[0.04] p-4 text-xs leading-6">{env}</pre>
        <div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => void copy()}><Copy size={16} />{copied ? "Kopiert" : "Werte kopieren"}</Button><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"><Button variant="secondary">Supabase öffnen<ExternalLink size={16} /></Button></a></div>
        <p className="mt-6 text-xs leading-5 text-black/45">Verwende niemals einen Service-Role-Key. Der Publishable/Anon Key darf im Browser sichtbar sein; die Daten werden durch Row Level Security geschützt.</p>
      </div>
    </Card>
  </div>;
}
