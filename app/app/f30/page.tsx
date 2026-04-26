import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardApp from "./_components/AdminDashboardApp";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/admin-session";

// Server-side gate: verify the admin_session cookie before rendering the
// dashboard shell. Prevents the brief flash of admin chrome that the
// client-only redirect produced.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSession(token);
  if (!session) {
    redirect("/f30/login");
  }

  return <AdminDashboardApp />;
}

