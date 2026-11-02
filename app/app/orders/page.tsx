import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

type SearchParams = { notice?: string; error?: string };

function customerName(customers: { name: string } | Array<{ name: string }> | null): string {
  return Array.isArray(customers) ? customers[0]?.name ?? "Client inconnu" : customers?.name ?? "Client inconnu";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  let customers: Array<{ id: string; name: string }> = [];
  let orders: Array<{ id: string; status: string; total_minor: number; created_at: string; customers: { name: string } | Array<{ name: string }> | null }> = [];
  let payments: Record<string, number> = {};
  let errorMessage: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login?notice=signin-required");
    const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single();
    if (!membership) errorMessage = "Aucune organisation n'est associée à votre compte.";
    else {
      const customerResult = await supabase.from("customers").select("id,name").eq("organization_id", membership.organization_id).order("name");
      customers = customerResult.data ?? [];
      const orderResult = await supabase.from("orders").select("id,status,total_minor,created_at,customers(name)").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(100);
      orders = (orderResult.data ?? []) as typeof orders;
      if (orderResult.error) errorMessage = "Impossible de charger les commandes.";
      const paymentResult = await supabase.from("payments").select("order_id,amount_minor,status").eq("organization_id", membership.organization_id).eq("status", "recorded");
      payments = (paymentResult.data ?? []).reduce<Record<string, number>>((sum, payment) => {
        sum[payment.order_id] = (sum[payment.order_id] ?? 0) + payment.amount_minor;
        return sum;
      }, {});
    }
  } catch {
    errorMessage = "Supabase n'est pas configuré.";
  }

  return (
    <main className="dashboard">
      <header>
        <h1>Commandes</h1>
        <div className="actions"><Link className="button secondary" href="/app/dashboard">Tableau de bord</Link><a className="button secondary" href="/api/export/orders">Exporter CSV</a></div>
      </header>
      {(params.notice || params.error || errorMessage) && <p role="status">
        {params.error === "invalid" && "Données invalides ou paiement supérieur au solde."}
        {params.error === "save" && "Impossible d'enregistrer les données."}
        {params.error === "configuration" && "Configuration externe manquante."}
        {params.notice === "created" && "Commande créée."}
        {params.notice === "payment-recorded" && "Paiement manuel enregistré."}
        {errorMessage}
      </p>}

      <section className="customer-layout">
        <form className="auth-card" action="/api/orders" method="post">
          <h2>Nouvelle commande</h2>
          <label>Client<select name="customerId" required defaultValue=""><option value="" disabled>Sélectionner</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          {[0, 1, 2].map((index) => (
            <fieldset key={index}>
              <legend>Article {index + 1}{index === 0 ? " (obligatoire)" : ""}</legend>
              <label>Description<input name={`description_${index}`} required={index === 0} maxLength={200} /></label>
              <label>Quantité<input name={`quantity_${index}`} type="number" min="1" required={index === 0} /></label>
              <label>Prix unitaire (XOF)<input name={`unitPriceMinor_${index}`} type="number" min="0" required={index === 0} /></label>
            </fieldset>
          ))}
          <button className="button primary" type="submit">Créer la commande</button>
        </form>

        <div className="customer-list">
          {orders.map((order) => {
            const paid = payments[order.id] ?? 0;
            const balance = Math.max(0, order.total_minor - paid);
            return (
              <article key={order.id}>
                <strong>{customerName(order.customers)}</strong>
                <span>{order.status} · {new Date(order.created_at).toLocaleDateString("fr-FR")} · Total {order.total_minor} XOF · Payé {paid} XOF · Solde {balance} XOF</span>
                {balance > 0 && <form action="/api/payments" method="post">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input name="amountMinor" type="number" min="1" max={balance} required aria-label="Montant XOF" />
                  <input name="paidAt" type="datetime-local" required />
                  <select name="method" required><option value="cash">Espèces</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Virement</option><option value="check">Chèque</option><option value="other">Autre</option></select>
                  <input name="reference" maxLength={100} placeholder="Référence" />
                  <button className="button secondary" type="submit">Enregistrer un paiement manuel</button>
                </form>}
              </article>
            );
          })}
          {orders.length === 0 && <p>Aucune commande trouvée.</p>}
        </div>
      </section>
    </main>
  );
}
