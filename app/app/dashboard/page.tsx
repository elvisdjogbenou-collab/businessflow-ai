import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function DashboardPage() {
  let customerCount = 0;
  let orderCount = 0;
  let paymentTotal = 0;
  let followUpCount = 0;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login?notice=signin-required");
    const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single();
    if (membership) {
      const [customers, orders, payments, followUps] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
        supabase.from("payments").select("amount_minor").eq("organization_id", membership.organization_id).eq("status", "recorded"),
        supabase.from("follow_up_tasks").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("status", "pending"),
      ]);
      customerCount = customers.count ?? 0;
      orderCount = orders.count ?? 0;
      paymentTotal = (payments.data ?? []).reduce((sum, payment) => sum + payment.amount_minor, 0);
      followUpCount = followUps.count ?? 0;
    }
  } catch {
    redirect("/login?error=configuration");
  }

  return (
    <main className="dashboard">
      <header><h1>Tableau de bord</h1><form action="/api/auth/signout" method="post"><button className="button secondary">Déconnexion</button></form></header>
      <section className="feature-grid">
        <Link href="/app/customers"><article><strong>Clients</strong><span>{customerCount} enregistrés</span></article></Link>
        <Link href="/app/orders"><article><strong>Commandes</strong><span>{orderCount} enregistrées</span></article></Link>
        <article><strong>Paiements</strong><span>{paymentTotal} FCFA enregistrés</span></article>
        <Link href="/app/follow-ups"><article><strong>Relances</strong><span>{followUpCount} à venir</span></article></Link>
      </section>
    </main>
  );
}
