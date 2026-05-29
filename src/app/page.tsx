import { RegistrationFlow } from "@/components/registration-flow";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5,_#f8fafc_45%,_#e2e8f0)] px-6 py-10 text-slate-950 sm:px-10 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <RegistrationFlow />
      </div>
    </main>
  );
}
