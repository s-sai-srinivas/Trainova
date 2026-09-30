import prisma from "@/lib/db";
import InviteForm from "./InviteForm";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InviteActivationPage({ params }: InvitePageProps) {
  const { token } = await params;

  // Verify the invite token against the database on the server
  const user = await prisma.user.findFirst({
    where: {
      inviteToken: token,
      inviteExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return (
      <div 
        className="flex-col justify-center items-center" 
        style={{ 
          minHeight: "100vh", 
          backgroundColor: "var(--bg-primary)",
          padding: "16px",
          color: "var(--accent-white)"
        }}
      >
        <div 
          className="glass-card flex-col gap-md text-center"
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "32px 24px",
            border: "1px solid var(--border-frosted)"
          }}
        >
          <span style={{ fontSize: "40px" }}>⚠️</span>
          <h2 className="text-heading" style={{ fontSize: "20px", marginTop: "12px" }}>Invite Expired or Invalid</h2>
          <p style={{ fontSize: "14px", color: "var(--accent-muted)", lineHeight: "1.5" }}>
            This cryptographic invitation link is invalid or has expired (invites are active for 48 hours). Please contact your trainer to request a new invite link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-col justify-center items-center" 
      style={{ 
        minHeight: "100vh", 
        backgroundColor: "var(--bg-primary)",
        padding: "16px",
        color: "var(--accent-white)"
      }}
    >
      <div 
        className="glass-card flex-col gap-md"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px 24px",
          border: "1px solid var(--border-frosted)",
          backgroundColor: "var(--bg-surface-glass)"
        }}
      >
        <div className="flex-col items-center text-center gap-xs">
          <span 
            style={{ 
              fontFamily: "var(--font-heading)", 
              fontSize: "28px", 
              fontWeight: 800, 
              letterSpacing: "0.05em",
              textTransform: "uppercase"
            }}
          >
            Activate Account
          </span>
          <span style={{ fontSize: "13px", color: "var(--accent-muted)" }}>
            Welcome to CoachOS, {user.name}!
          </span>
        </div>

        <InviteForm token={token} defaultEmail={user.email || ""} />
      </div>
    </div>
  );
}
