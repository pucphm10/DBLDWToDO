import { Database, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../app/AuthProvider";
import { Badge, Button, Card, Notice } from "../components/ui";

export function SettingsPage() {
  const { user, signOut } = useAuth();
  return <div className="grid max-w-3xl gap-7">
    <div><h2 className="font-display text-3xl font-extrabold">Einstellungen</h2><p className="mt-2 text-sm text-black/45">Account, Verbindung und Sicherheit.</p></div>
    <Card className="p-6"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-moss-100 text-moss-700"><UserRound size={22} /></div><div><p className="font-display font-bold">{user?.user_metadata?.display_name || user?.email?.split("@")[0]}</p><p className="text-sm text-black/45">{user?.email}</p></div></div></Card>
    <Card className="divide-y divide-black/[0.06] overflow-hidden"><div className="flex items-center justify-between p-5"><div className="flex items-center gap-3"><Database className="text-moss-600" size={19} /><div><p className="text-sm font-bold">Supabase</p><p className="text-xs text-black/40">Datenbank und Auth verbunden</p></div></div><Badge tone="green">Aktiv</Badge></div><div className="flex items-center justify-between p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-moss-600" size={19} /><div><p className="text-sm font-bold">Row Level Security</p><p className="text-xs text-black/40">Alle Daten sind benutzerbezogen geschützt</p></div></div><Badge tone="green">Erforderlich</Badge></div><div className="flex items-center justify-between p-5"><div className="flex items-center gap-3"><KeyRound className="text-moss-600" size={19} /><div><p className="text-sm font-bold">Passwort</p><p className="text-xs text-black/40">Änderung über den Reset-Link</p></div></div></div></Card>
    <Notice>Der im Browser sichtbare Publishable/Anon Key ist kein Geheimnis. RLS stellt sicher, dass du ausschließlich deine eigenen Daten lesen und ändern kannst.</Notice>
    <Button variant="secondary" className="justify-self-start" onClick={() => void signOut()}><LogOut size={17} />Abmelden</Button>
  </div>;
}
