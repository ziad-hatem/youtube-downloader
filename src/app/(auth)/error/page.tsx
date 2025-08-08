"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      case "Default":
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4 text-red-600">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-6">{getErrorMessage(error)}</p>
        <div className="space-y-3">
          <Link
            href="/signin"
            className="block w-full rounded bg-blue-600 text-white py-2 px-4 text-center"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full rounded border border-gray-300 text-gray-700 py-2 px-4 text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
