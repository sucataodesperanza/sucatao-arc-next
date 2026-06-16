import { redirect } from "next/navigation"
import "../../styles/admin-home.css"

export default function AdminPage() {
  redirect("/admin/catalogo")
}
