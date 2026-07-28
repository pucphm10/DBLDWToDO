import { Link } from "react-router-dom";
import { Button } from "../components/ui";

export function NotFoundPage() {
  return <div className="grid min-h-screen place-items-center bg-paper px-5 text-center"><div><p className="font-display text-7xl font-black text-moss-100">404</p><h1 className="mt-3 font-display text-2xl font-extrabold">Diese Seite gibt es nicht.</h1><Link to="/"><Button className="mt-6">Zur Übersicht</Button></Link></div></div>;
}
