import { AdminShell } from "@/components/admin-shell";

export default function AdminDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
