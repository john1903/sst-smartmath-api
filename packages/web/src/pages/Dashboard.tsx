import { Button, Card } from "@smartmath/ui";
import { useAuth } from "../auth/AuthProvider";

export function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "var(--sm-ink-500)" }}>
            Signed in as <strong>{user?.email ?? user?.sub}</strong>
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          Log out
        </Button>
      </header>
      <Card variant="elevated" padding="lg">
        <h2 style={{ marginTop: 0 }}>Welcome to the admin panel</h2>
        <p style={{ margin: 0 }}>
          More coming soon. From here you'll manage exercises, categories,
          requirements, and uploads.
        </p>
      </Card>
    </div>
  );
}
