import { redirect } from "next/navigation";

// Raíz → redirigir al dashboard (el middleware manejará si no está autenticado)
export default function RootPage() {
  redirect("/home");
}
