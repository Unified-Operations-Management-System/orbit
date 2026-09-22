import { createOrbitClient } from "@orbit/api-client";

const api = createOrbitClient(process.env.API_URL!);

export default async function Home() {
  const { data, error } = await api.GET("/hello", { cache: "no-store" });
  if (error || !data) throw new Error("Failed to reach Orbit API");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">{data.message}</h1>
    </main>
  );
}
