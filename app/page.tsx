import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <section className="hero">
        <span className="eyebrow">BusinessFlow AI</span>
        <h1>Gardez le contrôle de vos ventes et de vos paiements.</h1>
        <p>
          Clients, prospects, commandes, soldes et relances dans un espace
          simple, mobile et sécurisé.
        </p>
        <div className="actions">
          <Link className="button primary" href="/login">Se connecter</Link>
          <Link className="button secondary" href="/signup">Créer un compte</Link>
        </div>
      </section>
      <section className="feature-grid" aria-label="Fonctionnalités principales">
        <article><strong>Clients</strong><span>Prospects et historique centralisés.</span></article>
        <article><strong>Commandes</strong><span>Articles, montants et statuts suivis.</span></article>
        <article><strong>Paiements</strong><span>Soldes calculés sans ambiguïté.</span></article>
        <article><strong>Relances</strong><span>Prochaines tâches toujours visibles.</span></article>
      </section>
    </main>
  );
}
