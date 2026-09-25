import { redirect } from "next/navigation";

// Self-service sign-up is closed: customer organizations are set up by the
// developer once an agreement is in place (see docs/CUSTOMER_ONBOARDING.md).
// The address still resolves so an old bookmark or emailed link lands on the
// sign-in page instead of a 404.
export default function AdminSignUpPage() {
  redirect("/admin/login");
}
