import { AdminSection } from "../section";

export default function AdminPaymentsPage() {
  return (
    <AdminSection
      title="Payments"
      lede="Card, bank, and crypto intents, and what actually settled."
      body="Flutterwave and Stripe stay behind the same payment intent. This desk shows amount, method, and whether the stay confirmed."
    />
  );
}
