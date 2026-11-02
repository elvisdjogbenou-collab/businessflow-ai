export function isProtectedApplicationPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}
