import { AdminSection } from "../section";

export default function AdminAgenciesPage() {
  return (
    <AdminSection
      title="Agencies"
      lede="Hosts, verification, and who is allowed to go LIVE."
      body="Verify an agency, see their units, and pause a bad actor. The verify API already exists. This desk is the list."
    />
  );
}
