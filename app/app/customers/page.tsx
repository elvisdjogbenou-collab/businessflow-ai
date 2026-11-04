import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationContext } from "@/lib/organization-context";
import { escapeLikePattern } from "@/lib/postgrest";

type SearchParams = {
  search?: string;
  kind?: string;
  notice?: string;
  error?: string;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  let customers: Array<{ id: string; kind: string; name: string; phone: string | null; email: string | null }> = [];
  let errorMessage: string | null = null;

  try {
    const context = await getOrganizationContext();
    if (!context) {
      errorMessage = "Aucune organisation n'est associée à votre compte.";
    } else {
      let query = context.supabase
        .from("customers")
        .select("id, kind, name, phone, email")
        .eq("organization_id", context.organizationId)
        .order("name");
      if (params.kind === "lead" || params.kind === "customer") {
        query = query.eq("kind", params.kind);
      }
      if (params.search?.trim()) {
        const search = escapeLikePattern(params.search.trim());
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query.limit(100);
      if (error) errorMessage = "Impossible de charger les clients.";
      customers = data ?? [];
    }
  } catch {
    errorMessage = "Supabase n'est pas configuré.";
  }

  return (
    <main className="dashboard">
      <header>
        <h1>Clients et prospects</h1>
        <Link className="button secondary" href="/app/dashboard">Tableau de bord</Link>
      </header>

      {(params.notice || params.error || errorMessage) && (
        <p role="status">
          {params.error === "invalid" && "Données invalides."}
          {params.error === "save" && "Impossible d'enregistrer les données."}
          {params.error === "configuration" && "Configuration externe manquante."}
          {params.notice === "created" && "Client créé."}
          {params.notice === "updated" && "Client modifié."}
          {params.notice === "deleted" && "Client supprimé."}
          {errorMessage}
        </p>
      )}

      <form method="get" className="filters">
        <input name="search" defaultValue={params.search ?? ""} placeholder="Nom, téléphone ou email" />
        <select name="kind" defaultValue={params.kind ?? ""}>
          <option value="">Tous</option>
          <option value="lead">Prospect</option>
          <option value="customer">Client</option>
        </select>
        <button className="button primary" type="submit">Filtrer</button>
      </form>

      <section className="customer-layout">
        <form className="auth-card" action="/api/customers" method="post">
          <h2>Nouveau client</h2>
          <label>Type
            <select name="kind" required defaultValue="lead">
              <option value="lead">Prospect</option>
              <option value="customer">Client</option>
            </select>
          </label>
          <label>Nom<input name="name" required minLength={2} maxLength={200} /></label>
          <label>Téléphone<input name="phone" maxLength={30} /></label>
          <label>Email<input type="email" name="email" maxLength={254} /></label>
          <button className="button primary" type="submit">Ajouter</button>
        </form>

        <div className="customer-list">
          {customers.map((customer) => (
            <article key={customer.id}>
              <strong>{customer.name}</strong>
              <span>{customer.kind === "lead" ? "Prospect" : "Client"}{customer.phone ? ` · ${customer.phone}` : ""}{customer.email ? ` · ${customer.email}` : ""}</span>
              <details>
                <summary>Modifier / supprimer</summary>
                <form action="/api/customers" method="post">
                  <input type="hidden" name="id" value={customer.id} />
                  <input type="hidden" name="_action" value="update" />
                  <select name="kind" defaultValue={customer.kind}>
                    <option value="lead">Prospect</option>
                    <option value="customer">Client</option>
                  </select>
                  <input name="name" defaultValue={customer.name} required minLength={2} maxLength={200} />
                  <input name="phone" defaultValue={customer.phone ?? ""} maxLength={30} />
                  <input type="email" name="email" defaultValue={customer.email ?? ""} maxLength={254} />
                  <button className="button secondary" type="submit">Enregistrer</button>
                </form>
                <form action="/api/customers" method="post">
                  <input type="hidden" name="id" value={customer.id} />
                  <input type="hidden" name="_action" value="delete" />
                  <button className="button danger" type="submit">Supprimer</button>
                </form>
              </details>
            </article>
          ))}
          {customers.length === 0 && <p>Aucun client trouvé.</p>}
        </div>
      </section>
    </main>
  );
}
