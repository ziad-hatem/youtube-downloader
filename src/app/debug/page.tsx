import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function DebugPage() {
  const session = await getServerSession(authOptions);

  const envVars = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
    MONGODB_URI: process.env.MONGODB_URI ? "SET" : "NOT SET",
    MONGODB_DB: process.env.MONGODB_DB,
    YTDL_COOKIE: process.env.YTDL_COOKIE ? "SET" : "NOT SET",
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-6">Debug Information</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-2">Environment Variables</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm">{JSON.stringify(envVars, null, 2)}</pre>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">Session</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm">{JSON.stringify(session, null, 2)}</pre>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">NextAuth Config</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm">
              {JSON.stringify(
                {
                  secret: authOptions.secret ? "SET" : "NOT SET",
                  session: authOptions.session,
                  pages: authOptions.pages,
                  debug: authOptions.debug,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
