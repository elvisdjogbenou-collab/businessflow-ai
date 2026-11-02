import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="auth-page">
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
