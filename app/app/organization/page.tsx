import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationContext } from "@/lib/organization-context";

type SearchParams = {
  notice?: string;
  error?: string;
};

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await getOrganizationContext();
  if (!context) redirect("/login?notice=signin-required");

  const [organizationResult, membershipsResult, invitationsResult] = await Promise.all([
    context.supabase.from("organizations").select("id, name").eq("id", context.organizationId).single(),
    context.supabase.from("organization_members").select("organization_id, user_id, role").eq("organization_id", context.organizationId),
    context.supabase.from("organization_invitations").select("id, invited_email, role, status, expires_at").eq("organization_id", context.organizationId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  const organization = organizationResult.data;
  const memberships = membershipsResult.data ?? [];
  const invitations = invitationsResult.data ?? [];
  const currentMembership = memberships.find((membership) => membership.user_id === context.user.id);
  const isOwner = currentMembership?.role === "owner";

  const allMembershipsResult = await context.supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", context.user.id);
  const organizationsResult = await context.supabase
    .from("organizations")
    .select("id, name")
    .in("id", (allMembershipsResult.data ?? []).map((membership) => membership.organization_id));

  const organizations = organizationsResult.data ?? [];

  const message = params.error
    ? ({
        invalid: "Données invalides.",
        save: "Impossible d'enregistrer.",
        permission: "Cette action nécessite les droits de propriétaire ou de gestionnaire.",
        invite: "Invitation invalide, expirée ou adressée à un autre compte.",
        configuration: "Configuration externe manquante.",
      } as Record<string, string>)[params.error] ?? "Une erreur est survenue."
    : ({
        created: "Organisation créée.",
        renamed: "Organisation renommée.",
        invited: "Invitation créée.",
        cancelled: "Invitation annulée.",
        joined: "Vous avez rejoint l'organisation.",
        switched: "Organisation active changée.",
      } as Record<string, string>)[params.notice ?? ""];

  return (
    <main className="dashboard">
      <header>
        <h1>Organisation</h1>
        <Link className="button secondary" href="/app/dashboard">Tableau de bord</Link>
      </header>
      {message && <p role="status">{message}</p>}

      {organizations.length > 1 && (
        <section className="customer-layout">
          <form className="auth-card" action="/api/organizations" method="post">
            <h2>Changer d&apos;organisation</h2>
            <input type="hidden" name="_action" value="switch" />
            <label>
              Organisation
              <select name="organization_id" defaultValue={context.organizationId}>
                {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <button className="button primary" type="submit">Activer</button>
          </form>
        </section>
      )}

      <section className="customer-layout">
        <form className="auth-card" action="/api/organizations" method="post">
          <input type="hidden" name="_action" value="accept" />
          <h2>Accepter une invitation</h2>
          <label>Jeton d&apos;invitation<input name="token" required /></label>
          <button className="button primary" type="submit">Rejoindre</button>
        </form>
      </section>

      <section className="customer-layout">
        <form className="auth-card" action="/api/organizations" method="post">
          <input type="hidden" name="_action" value="create" />
          <h2>Créer une organisation</h2>
          <label>Nom<input name="name" required minLength={2} maxLength={100} /></label>
          <button className="button primary" type="submit">Créer</button>
        </form>

        {organization && (
          <div className="customer-list">
            <article>
              <strong>{organization.name}</strong>
              <span>{currentMembership?.role === "owner" ? "Propriétaire" : currentMembership?.role === "manager" ? "Gestionnaire" : "Membre"}</span>
            </article>
            {isOwner && (
              <form className="auth-card" action="/api/organizations" method="post">
                <input type="hidden" name="_action" value="rename" />
                <label>Nouveau nom<input name="name" required minLength={2} maxLength={100} defaultValue={organization.name} /></label>
                <button className="button secondary" type="submit">Renommer</button>
              </form>
            )}
          </div>
        )}
      </section>

      {organization && (
        <section className="customer-layout">
          {(isOwner || currentMembership?.role === "manager") && (
            <form className="auth-card" action="/api/organizations" method="post">
              <input type="hidden" name="_action" value="invite" />
              <h2>Inviter un membre</h2>
              <label>Email<input type="email" name="email" required maxLength={254} /></label>
              <label>Rôle<select name="role" defaultValue="member"><option value="member">Membre</option><option value="manager">Gestionnaire</option></select></label>
              <button className="button primary" type="submit">Inviter</button>
            </form>
          )}
          <div className="customer-list">
            <h2>Membres</h2>
            {memberships.map((membership) => (
              <article key={membership.user_id}>
                <strong>{membership.user_id === context.user.id ? "Vous" : membership.user_id}</strong>
                <span>{membership.role}</span>
              </article>
            ))}
            <h2>Invitations en attente</h2>
            {invitations.map((invitation) => (
              <article key={invitation.id}>
                <strong>{invitation.invited_email}</strong>
                <span>{invitation.role} · expire le {new Date(invitation.expires_at).toLocaleDateString("fr-FR")}</span>
                {(isOwner || currentMembership?.role === "manager") && (
                  <form action="/api/organizations" method="post">
                    <input type="hidden" name="_action" value="cancel" />
                    <input type="hidden" name="invitation_id" value={invitation.id} />
                    <button className="button danger" type="submit">Annuler</button>
                  </form>
                )}
              </article>
            ))}
            {invitations.length === 0 && <p>Aucune invitation en attente.</p>}
          </div>
        </section>
      )}
    </main>
  );
}
