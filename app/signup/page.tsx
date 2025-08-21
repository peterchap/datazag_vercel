import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SignupAliasPage() {
  // Redirect legacy/alternate path to the canonical registration page
  redirect("/register");
}
