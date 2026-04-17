
"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ImageIcon, MoreVertical, Loader2 } from "lucide-react";
import type { Rate } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteRate } from "@/services/rate-service";
import { TierBadge } from "@/components/ui/tier-badge";

interface AdminRateCardProps {
  rate: Rate;
  onDelete: (id: string) => void;
}

export function AdminRateCard({ rate, onDelete }: AdminRateCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteRate(rate.id);
      toast({
        title: "Rate Card Deleted",
        description: `"${rate.title}" has been successfully deleted.`,
      });
      onDelete(rate.id);
    } catch (error) {
      console.error("Failed to delete rate card:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the rate card. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
    }
  };

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the rate card and all associated files from storage.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, delete it
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg">
        <CardHeader className="p-0 relative">
          <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/rates/edit/${rate.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsAlertOpen(true)} className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
          <div className="relative aspect-video bg-muted/30">
            {rate.imageUrl ? (
              <Image
                  src={rate.imageUrl}
                  alt={rate.title}
                  layout="fill"
                  objectFit="cover"
                  className="border-b"
                  referrerPolicy="no-referrer"
                  data-ai-hint="lioness resting"
                  unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow">
          <h2 className="text-lg font-semibold tracking-tight mb-2">{rate.title}</h2>
          {rate.fileUrl && (
              <a
              href={rate.fileUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="text-accent font-semibold hover:underline text-lg"
              >
              Click to Download
              </a>
          )}
          <p className="text-muted-foreground text-sm mt-4">{rate.description}</p>
        </CardContent>
        <CardFooter className="px-6 pb-6 pt-0 border-t pt-4 flex-col items-start gap-4">
          <div className="w-full">
              <p className="text-sm font-semibold mb-2">Visible to Tiers:</p>
              <div className="flex flex-wrap gap-2">
                  {rate.tier_access.map(tier => (
                      <TierBadge key={tier} tier={tier} />
                  ))}
              </div>
          </div>
          <Separator />
          <div className="w-full">
              <p className="text-sm font-semibold mb-2">Visible to User Types:</p>
              <div className="flex flex-wrap gap-2">
                  {rate.user_type_access.map(type => (
                      <Badge key={type} variant="outline" className="capitalize">{type}</Badge>
                  ))}
              </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
