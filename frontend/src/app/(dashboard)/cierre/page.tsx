import { redirect } from "next/navigation";

// Redirige al cierre actual por defecto
export default function CierrePage() {
  redirect("/cierre/actual");
}
