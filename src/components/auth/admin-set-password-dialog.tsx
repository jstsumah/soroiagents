
"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminSetUserPassword } from "@/services/admin-service";
import type { User } from "@/lib/types";

interface AdminSetPasswordDialogProps {
  user: User;
  trigger?: React.ReactNode;
}

export function AdminSetPasswordDialog({ user, trigger }: AdminSetPasswordDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSetPassword() {
    if (!newPassword || newPassword.length < 8) return;

    setIsLoading(true);
    try {
      await adminSetUserPassword(user.uid, newPassword);
      toast({
        title: "Password Updated",
        description: `Successfully set a new password for ${user.name}. They will be required to change it on their next login.`,
      });
      setIsOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not set user password.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ShieldAlert className="mr-2 h-4 w-4" />
            Set Password
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set User Password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{user.name}</strong>. The user will be required to change this password upon their next login.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter at least 8 characters"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSetPassword} disabled={isLoading || !newPassword || newPassword.length < 8}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Set Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
