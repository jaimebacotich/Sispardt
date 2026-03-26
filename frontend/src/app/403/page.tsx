import Link from "next/link";

export const metadata = { title: "Acceso Denegado" };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="text-8xl font-black text-border mb-4">403</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Acceso Denegado
        </h1>
        <p className="text-muted-foreground mb-8">
          No tienes permisos para acceder a esta sección. Contacta al
          administrador si crees que esto es un error.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
