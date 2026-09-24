import { AdminSection } from "../section";

export default function AdminBookingsPage() {
  return (
    <AdminSection
      title="Bookings"
      lede="Holds, confirmed stays, and the ones that expired."
      body="Every channel writes the same booking. This desk is the cross-agency list: who held, who paid, which stay."
    />
  );
}
