import Link from "next/link";

export const metadata = { title: "Sesión cerrada" };

export default function LoggedOutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-slate-800">
      <div className="bg-card rounded-2xl shadow-2xl p-8 border border-white/10 w-full max-w-sm text-center">
        <p className="text-foreground text-sm mb-6">Sesión cerrada correctamente.</p>
        <Link
          href="/login"
          className="w-full inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
