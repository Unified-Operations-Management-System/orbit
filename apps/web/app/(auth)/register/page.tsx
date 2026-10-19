import Link from "next/link";
import { RegisterView } from "@/features/organization";

export default function RegisterPage() {
  return (
    <>
      <RegisterView />
      <p className="mx-auto w-full max-w-xl px-6 pb-12 text-sm text-muted">
        Already registered? <Link href="/sign-in" className="font-bold text-blue">Sign in</Link>
      </p>
    </>
  );
}
