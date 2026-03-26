import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { Loading } from "@/components/ui";

/**
 * Login Page
 * 
 * Wraps LoginForm in Suspense because it uses useSearchParams(),
 * which requires a Suspense boundary in Next.js 14 for static generation.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  );
}
