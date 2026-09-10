import { CategoryDistribution } from "../components/dashboard/CategoryDistribution";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { KpiRow } from "../components/dashboard/KpiRow";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { UsersTrend } from "../components/dashboard/UsersTrend";
import { AdminLayout } from "../layouts/AdminLayout";

export function Dashboard() {
  return (
    <AdminLayout>
      <DashboardHeader />
      <KpiRow />
      <div className="dashboard-grid">
        <UsersTrend />
        <CategoryDistribution />
      </div>
      <RecentActivity />
    </AdminLayout>
  );
}
