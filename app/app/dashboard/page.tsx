import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrganizationContext } from "@/lib/organization-context";

export default async function DashboardPage() {
  let customerCount = 0;
  let orderCount = 0;
  let paymentTotal = 0;
  let followUpCount = 0;
  let outstandingMinor = 0;
  let overdueFollowUpCount = 0;
  try {
    const context = await getOrganizationContext();
    if (!context) redirect("/login?notice=signin-required");
    if (context) {
      const [customers, ordersResult, payments, followUps, overdue] = await Promise.all([
        context.supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId),
        context.supabase.from("orders").select("id,total_minor,status").eq("organization_id", context.organizationId).neq("status", "cancelled"),
        context.supabase.from("payments").select("order_id,amount_minor").eq("organization_id", context.organizationId).eq("status", "recorded"),
        context.supabase.from("follow_up_tasks").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId).eq("status", "pending"),
        context.supabase.from("follow_up_tasks").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId).eq("status", "pending").lt("due_at", new Date().toISOString()),
      ]);
      customerCount = customers.count ?? 0;
      const orderRows = ordersResult.data ?? [];
      orderCount = orderRows.length;
      paymentTotal = (payments.data ?? []).reduce((sum, payment) => sum + payment.amount_minor, 0);
      const paidByOrder = (payments.data ?? []).reduce<Record<string, number>>((sum, payment) => {
        sum[payment.order_id] = (sum[payment.order_id] ?? 0) + payment.amount_minor;
        return sum;
      }, {});
      outstandingMinor = orderRows.reduce((sum, order) => sum + Math.max(0, order.total_minor - (paidByOrder[order.id] ?? 0)), 0);
      followUpCount = followUps.count ?? 0;
      overdueFollowUpCount = overdue.count ?? 0;
    }
  } catch {
    redirect("/login?error=configuration");
  }

  return (
    <main className="dashboard">
      <header><h1>Tableau de bord</h1><form action="/api/auth/signout" method="post"><button className="button secondary">Déconnexion</button></form></header>
      <section className="feature-grid">
        <Link href="/app/organization"><article><strong>Organisation</strong><span>Gérer l’équipe</span></article></Link>
        <Link href="/app/customers"><article><strong>Clients</strong><span>{customerCount} enregistrés</span></article></Link>
        <Link href="/app/orders"><article><strong>Commandes</strong><span>{orderCount} enregistrées</span></article></Link>
        <article><strong>Paiements</strong><span>{paymentTotal} FCFA enregistrés</span></article>
        <article><strong>Impayés</strong><span>{outstandingMinor} FCFA restants</span></article>
        <Link href="/app/follow-ups"><article><strong>Relances</strong><span>{followUpCount} à venir</span></article></Link>
        <article><strong>Alertes</strong><span>{overdueFollowUpCount} relances en retard</span></article>
      </section>
    </main>
  );
}
