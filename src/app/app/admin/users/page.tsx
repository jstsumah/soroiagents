

"use client";

import { getUsers, getUser } from "@/services/user-service";
import { UserTable } from "./user-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutDashboard, Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { User } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "../../app-provider";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const { user: viewingUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [displayedUsers, setDisplayedUsers] = React.useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAuthLoading && viewingUser && viewingUser.role === 'Agent' && !viewingUser.canViewUsers) {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [viewingUser, isAuthLoading, router]);

  React.useEffect(() => {
    if (viewingUser) {
      const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
          const allUsers = await getUsers();
          if (viewingUser?.role === 'Super Admin' || viewingUser?.role === 'Admin') {
            setDisplayedUsers(allUsers || []);
          } else {
            // Non-admin with canViewUsers permission.
            setDisplayedUsers((allUsers || []).filter(u => u.role === 'Agent'));
          }
        } catch (error) {
           console.error("Failed to fetch user data:", error);
           setDisplayedUsers([]);
        } finally {
            setIsUsersLoading(false);
        }
      }
      fetchUsers();
    }
  }, [viewingUser]);
  
  const isLoading = isAuthLoading || isUsersLoading;
  const canManageUsers = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';

  if (isLoading || !viewingUser || (viewingUser.role === 'Agent' && !viewingUser.canViewUsers)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!viewingUser) {
     return (
        <Alert variant="destructive">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>Could not verify your identity. Please try logging in again.</AlertDescription>
        </Alert>
     )
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
             {canManageUsers
              ? "Manage all user accounts, including Admins and Agents."
              : "View the list of registered agents."
             }
          </p>
        </div>
        <div className="flex items-center gap-2">
            {canManageUsers && (
                <Link href="/app/agent/dashboard">
                    <Button variant="outline">
                        <LayoutDashboard className="mr-2 h-[18px] w-[18px]" />
                        View Agent Dashboard
                    </Button>
                </Link>
            )}
            {canManageUsers && (
                <Link href="/app/admin/users/add">
                    <Button>
                        <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                        Add User
                    </Button>
                </Link>
            )}
        </div>
      </div>
      <UserTable users={displayedUsers} viewingUser={viewingUser}/>
    </div>
  );
}
