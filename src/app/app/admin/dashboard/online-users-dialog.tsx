
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import type { User } from "@/lib/types";
import Link from "next/link";

interface OnlineUsersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onlineUsers: User[];
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
};

export function OnlineUsersDialog({ isOpen, onOpenChange, onlineUsers }: OnlineUsersDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Online Agents ({onlineUsers.length})</DialogTitle>
          <DialogDescription>
            These agents have been active in the last 5 minutes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {onlineUsers.length > 0 ? (
            onlineUsers.map((user) => (
                <Link key={user.uid} href={`/app/admin/users/${user.uid}`} className="block">
                    <div className="flex items-center gap-4 p-2 rounded-md hover:bg-muted transition-colors">
                        <Avatar>
                            <AvatarImage src={`/avatars/0${(parseInt(user.uid) % 5) + 1}.png`} alt={`@${user.name}`} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <TierBadge tier={user.tier} />
                    </div>
                </Link>
            ))
          ) : (
            <p className="text-muted-foreground text-center">No agents are currently online.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
