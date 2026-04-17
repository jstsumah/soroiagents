

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { handleSignOut } from "@/services/user-service";

export function UserNav({ user }: { user: User }) {
  const router = useRouter();
  const [initials, setInitials] = useState('');

  useEffect(() => {
    if (user.name) {
      const names = user.name.split(' ');
      if (names.length > 1 && names[0] && names[1]) {
        setInitials(`${names[0][0]}${names[1][0]}`);
      } else if (names[0]) {
        setInitials(names[0].substring(0, 2));
      }
    }
  }, [user.name]);
  
  const handleProfileClick = () => {
    let profilePath = '';
    if (user.role === 'Admin' || user.role === 'Super Admin') {
        // Admins can view any user profile, but this link should take them to their own.
        profilePath = `/app/admin/users/${user.uid}`;
    } else {
        // Agents have a dedicated profile page.
        profilePath = `/app/agent/profile`;
    }
    router.push(profilePath);
  }

  const handleLogout = async () => {
    await handleSignOut();
    router.push('/');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`/avatars/0${(parseInt(user.uid) % 5) + 1}.png`} alt={`@${user.name}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick}>
            Profile
          </DropdownMenuItem>
          {(user.role === 'Admin' || user.role === 'Super Admin') && (
            <DropdownMenuItem onClick={() => router.push('/app/admin/settings')}>
              Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
