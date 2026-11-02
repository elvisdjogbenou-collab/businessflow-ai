import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

type SearchParams = { notice?: string; error?: string };

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  let tasks: Array<{ id: string; title: string; due_at: string; status: string; notes: string | null }> = [];
  let customers: Array<{ id: string; name: string }> = [];
  let errorMessage: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login?notice=signin-required");
    const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single();
    if (membership) {
      const tasksResult = await supabase.from("follow_up_tasks").select("id,title,due_at,status,notes").eq("organization_id", membership.organization_id).order("due_at");
      tasks = tasksResult.data ?? [];
      const customersResult = await supabase.from("customers").select("id,name").eq("organization_id", membership.organization_id).order("name");
      customers = customersResult.data ?? [];
      if (tasksResult.error) errorMessage = "Impossible de charger les relances.";
    }
  } catch {
    errorMessage = "Supabase n'est pas configuré.";
  }
  return (
    <main className="dashboard">
      <header><h1>Relances</h1><Link className="button secondary" href="/app/dashboard">Tableau de bord</Link></header>
      {(params.notice || params.error || errorMessage) && <p role="status">{params.notice === "created" && "Relance créée."}{params.notice === "completed" && "Relance terminée."}{params.error === "invalid" && "Données invalides."}{params.error === "save" && "Impossible d'enregistrer la relance."}{errorMessage}</p>}
      <section className="customer-layout">
        <form className="auth-card" action="/api/follow-ups" method="post">
          <h2>Nouvelle relance</h2>
          <label>Titre<input name="title" required minLength={2} maxLength={200} /></label>
          <label>Client<select name="customerId" defaultValue=""><option value="">Tous / non lié</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label>Échéance<input name="dueAt" type="datetime-local" required /></label>
          <label>Notes<textarea name="notes" maxLength={2000} /></label>
          <button className="button primary" type="submit">Ajouter</button>
        </form>
        <div className="customer-list">{tasks.map((task) => <article key={task.id}><strong>{task.title}</strong><span>{new Date(task.due_at).toLocaleString("fr-FR")} · {task.status}</span>{task.notes && <p>{task.notes}</p>}{task.status !== "completed" && <form action="/api/follow-ups" method="post"><input type="hidden" name="_action" value="complete" /><input type="hidden" name="id" value={task.id} /><button className="button secondary" type="submit">Marquer terminée</button></form>}</article>)}{tasks.length === 0 && <p>Aucune relance.</p>}</div>
      </section>
    </main>
  );
}
