import Link from "next/link";

type SearchParams = {
  error?: string;
};

const errors: Record<string, string> = {
  configuration: "Configuration Supabase manquante. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
  invalid: "Adresse email ou mot de passe invalide.",
  signup: "Impossible de créer le compte. Vérifiez les paramètres Supabase et réessayez.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const message = params.error ? errors[params.error] : undefined;

  return (
    <main className="auth-page">
      {message && <p className="auth-message" role="alert">{message}</p>}
      <form className="auth-card" action="/api/auth/signup" method="post">
        <span className="eyebrow">BusinessFlow AI</span>
        <h1>Créer un compte</h1>
        <label>Email<input type="email" name="email" required autoComplete="email" /></label>
        <label>Mot de passe<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
        <button className="button primary" type="submit">Créer mon compte</button>
        <Link href="/login">J’ai déjà un compte</Link>
      </form>
    </main>
  );
}
