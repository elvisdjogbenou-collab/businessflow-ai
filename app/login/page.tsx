import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-page">
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
