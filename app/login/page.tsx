import Link from "next/link";

type SearchParams = {
  error?: string;
  notice?: string;
};

const errors: Record<string, string> = {
  configuration: "Configuration Supabase manquante. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
  invalid: "Adresse email ou mot de passe invalide.",
  credentials: "Email ou mot de passe incorrect.",
};

const notices: Record<string, string> = {
  "check-email": "Vérifiez votre boîte mail pour confirmer votre inscription.",
  "signin-required": "Connectez-vous pour accéder à cette page.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const message = params.error ? errors[params.error] : params.notice ? notices[params.notice] : undefined;

  return (
    <main className="auth-page">
      {message && <p className="auth-message" role="alert">{message}</p>}
      <form className="auth-card" action="/api/auth/login" method="post">
        <span className="eyebrow">BusinessFlow AI</span>
        <h1>Connexion</h1>
        <label>Email<input type="email" name="email" required autoComplete="email" /></label>
        <label>Mot de passe<input type="password" name="password" required minLength={8} autoComplete="current-password" /></label>
        <button className="button primary" type="submit">Se connecter</button>
        <Link href="/signup">Créer un compte</Link>
      </form>
    </main>
  );
}
