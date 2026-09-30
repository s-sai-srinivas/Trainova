import StatusHeader from "@/components/StatusHeader";
import BottomNav from "@/components/BottomNav";

export default function TrainerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-container">
      <StatusHeader />
      <main style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
