import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAccess } from "@/features/admin/auth/admin-access";
import { WorkspaceSection } from "@/features/admin/components/workspace-section";
import { EmptyState } from "@/features/admin/components/states";

export function AdminSettingsDemoPage() {
  const { admin } = useAdminAccess();
  const [fullName, setFullName] = useState(admin?.name ?? "Demo Admin");

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Demo-only preview of Admin identity, security, access administration, and audit surfaces.
        </p>
      </header>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="account">My Account</TabsTrigger>
          <TabsTrigger value="security">Security & Sessions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="administrators">Administrators</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Access History</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <WorkspaceSection
            title="Identity"
            description="Demo-only Admin profile preview. Changes stay in the browser."
          >
            <label className="flex max-w-md flex-col gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Display name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoCard label="Login email" value={admin?.email ?? "demo@kairoid.com"} />
              <InfoCard label="Role" value={admin?.role ?? "Admin"} />
              <InfoCard label="Account status" value="Active" />
              <InfoCard label="Email verification" value="Verified" />
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="security">
          <WorkspaceSection
            title="Security & sessions"
            description="Demo Mode simulates sessions locally without backend auth state."
          >
            <EmptyState
              title="Demo security preview"
              description="Session families, password changes, and revocation are simulated only in Demo Mode."
            />
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="notifications">
          <WorkspaceSection
            title="Notifications"
            description="Demo Mode keeps operational preferences local to this browser."
          >
            <EmptyState
              title="Notification preview"
              description="Production notification categories and persistence only appear when Demo Mode is disabled."
            />
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="administrators">
          <WorkspaceSection
            title="Administrators"
            description="Demo Mode previews internal access administration without backend truth."
          >
            <EmptyState
              title="Administrator directory preview"
              description="Invitations, sanctioned role assignment, and internal access lifecycle are backend-owned in production mode."
            />
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="roles">
          <WorkspaceSection
            title="Roles & permissions"
            description="Demo Mode mirrors the sanctioned internal role matrix visually only."
          >
            <EmptyState
              title="Role matrix preview"
              description="The backend-sanctioned roles and permission matrix load from real APIs in production mode."
            />
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="audit">
          <WorkspaceSection
            title="Access history"
            description="Demo Mode does not persist internal Admin access history."
          >
            <EmptyState
              title="No demo audit trail"
              description="Production access-history rows are append-only and backend-owned."
            />
          </WorkspaceSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
