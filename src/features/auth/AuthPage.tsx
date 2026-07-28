import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Headphones, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Field, Input, Notice } from "../../components/ui";
import { humanizeError } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../app/AuthProvider";

const schema = z.object({
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort braucht mindestens 8 Zeichen."),
  displayName: z.string().max(80).optional()
});
type FormValues = z.infer<typeof schema>;

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", displayName: "" } });
  if (user) return <Navigate to="/" replace />;

  const submit = form.handleSubmit(async (values) => {
    setMessage(null);
    try {
      if (mode === "register") {
        const redirect = `${window.location.origin}${window.location.pathname}#/`;
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { data: { display_name: values.displayName }, emailRedirectTo: redirect }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ tone: "success", text: "Fast geschafft. Bitte bestätige deine E-Mail-Adresse." });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
        if (error) throw error;
      }
      const target = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
      navigate(target, { replace: true });
    } catch (error) {
      setMessage({ tone: "error", text: humanizeError(error) });
    }
  });

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-sun font-display text-sm font-black text-ink">DW</div>
          <div><p className="font-display font-extrabold">DBLDW</p><p className="text-xs text-white/45">Production</p></div>
        </div>
        <div className="my-auto max-w-xl">
          <div className="mb-7 grid size-14 place-items-center rounded-2xl bg-white/10 text-sun"><Headphones size={27} /></div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">Dein klarer Weg von der Aufnahme bis zur Veröffentlichung.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/55">Wiederholbare Workflows, saubere Qualitätskontrolle und kein vergessener Produktionsschritt.</p>
          <div className="mt-10 grid gap-4 text-sm text-white/70">
            {["Vorlagen mit echter Versionierung", "Schnelle Schnittpunkt-Erfassung", "Lernvorschläge unter deiner Kontrolle"].map((item) => (
              <div key={item} className="flex items-center gap-3"><CheckCircle2 className="text-moss-400" size={18} />{item}</div>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/25">Persönliches Produktionssystem für DBLDW</p>
      </section>

      <main className="grid place-items-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-sun font-display text-sm font-black">DW</div>
            <span className="font-display font-extrabold">DBLDW Production</span>
          </div>
          <p className="text-sm font-bold text-moss-600">{mode === "login" ? "Willkommen zurück" : "Arbeitsbereich einrichten"}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{mode === "login" ? "Einloggen" : "Account erstellen"}</h1>
          <p className="mt-2 text-sm leading-6 text-black/45">{mode === "login" ? "Weiter an deiner nächsten Produktion." : "Deine drei DBLDW-Vorlagen werden automatisch angelegt."}</p>

          <form onSubmit={submit} className="mt-8 grid gap-5">
            {mode === "register" && <Field label="Name" error={form.formState.errors.displayName?.message}>
              <Input autoComplete="name" placeholder="Dein Name" {...form.register("displayName")} />
            </Field>}
            <Field label="E-Mail" error={form.formState.errors.email?.message}>
              <div className="relative"><Mail className="absolute left-3.5 top-3.5 text-black/30" size={17} /><Input className="pl-10" type="email" autoComplete="email" placeholder="name@beispiel.at" {...form.register("email")} /></div>
            </Field>
            <Field label="Passwort" hint={mode === "register" ? "Mindestens 8 Zeichen" : undefined} error={form.formState.errors.password?.message}>
              <div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 text-black/30" size={17} /><Input className="pl-10" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} {...form.register("password")} /></div>
            </Field>
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            <Button type="submit" disabled={form.formState.isSubmitting} className="mt-1 w-full">
              {form.formState.isSubmitting ? "Einen Moment …" : mode === "login" ? "Einloggen" : "Account erstellen"}<ArrowRight size={17} />
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link className="font-semibold text-moss-700 hover:underline" to={mode === "login" ? "/register" : "/login"}>
              {mode === "login" ? "Noch kein Account?" : "Schon registriert?"}
            </Link>
            {mode === "login" && <Link className="text-black/45 hover:text-ink" to="/reset-password">Passwort vergessen?</Link>}
          </div>
        </div>
      </main>
    </div>
  );
}

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const redirectTo = `${window.location.origin}${window.location.pathname}#/update-password`;
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (result.error) setError(humanizeError(result.error)); else setSent(true);
  }
  return <div className="grid min-h-screen place-items-center bg-paper px-5"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-soft sm:p-9">
    <h1 className="font-display text-2xl font-extrabold">Passwort zurücksetzen</h1>
    <p className="mt-2 text-sm leading-6 text-black/50">Wir schicken dir einen sicheren Link zum Ändern des Passworts.</p>
    {sent ? <div className="mt-6"><Notice tone="success">E-Mail versendet. Bitte prüfe auch deinen Spam-Ordner.</Notice><Link to="/login"><Button variant="secondary" className="mt-5 w-full">Zurück zum Login</Button></Link></div> :
      <form onSubmit={submit} className="mt-6 grid gap-4"><Field label="E-Mail"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>{error && <Notice tone="error">{error}</Notice>}<Button type="submit">Reset-Link senden</Button></form>}
  </div></div>;
}

export function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await supabase.auth.updateUser({ password });
    setMessage(result.error ? humanizeError(result.error) : "Passwort gespeichert. Du kannst weiterarbeiten.");
  }
  return <div className="grid min-h-screen place-items-center bg-paper px-5"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-soft">
    <h1 className="font-display text-2xl font-extrabold">Neues Passwort</h1>
    <div className="mt-6 grid gap-4"><Field label="Passwort" hint="Mindestens 8 Zeichen"><Input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>{message && <Notice tone="success">{message}</Notice>}<Button type="submit">Passwort speichern</Button></div>
  </form></div>;
}
