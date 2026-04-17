

"use client";

import { AddDealForm } from "./add-deal-form";
import { useAuth } from "@/app/app/app-provider";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Loader2 } from "lucide-react";

export default function AddDealPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role === 'Agent') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Exclusive Deal</h1>
        <p className="text-muted-foreground">
          Fill out the form below to add a new deal to the portal.
        </p>
      </div>
      <AddDealForm />
    </div>
  );
}
