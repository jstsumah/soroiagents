
"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Calendar, Loader2 } from "lucide-react";
import type { ExclusiveDeal } from "@/lib/types";
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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { deleteDeal } from "@/services/deal-service";
import { TierBadge } from "@/components/ui/tier-badge";

interface AdminDealCardProps {
  deal: ExclusiveDeal;
  onDelete: (id: string) => void;
}


export function AdminDealCard({ deal, onDelete }: AdminDealCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    if (deal.valid_until) {
      setFormattedDate(new Date(deal.valid_until).toLocaleDateString());
    }
  }, [deal.valid_until]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDeal(deal.id);
      toast({
        title: "Exclusive Deal Deleted",
        description: `"${deal.title}" has been successfully deleted.`,
      });
      onDelete(deal.id);
    } catch (error) {
      console.error("Failed to delete deal:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the deal. Please try again.",
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
                This action cannot be undone. This will permanently delete the deal and all associated files from storage.
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
                      <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/exclusive-deals/edit/${deal.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsAlertOpen(true)} className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
          <div className="relative aspect-video">
            <Image
              src={deal.imageUrl}
              alt={deal.title}
              fill
              objectFit="cover"
              className="border-b"
              data-ai-hint="safari deal"
              referrerPolicy="no-referrer"
              unoptimized
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow">
          <h2 className="text-lg font-semibold tracking-tight mb-2">{deal.title}</h2>
          <a
            href={deal.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="text-accent font-semibold hover:underline text-lg"
          >
            Click to Download
          </a>
          <p className="text-muted-foreground text-sm mt-4">{deal.description}</p>
        </CardContent>
        <CardFooter className="px-6 pb-6 pt-0 border-t pt-4 flex-col items-start gap-4">
          <div className="w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Valid until: {formattedDate}</span>
              </div>
              <Separator className="mb-4" />
          </div>
          <div className="w-full">
              <p className="text-sm font-semibold mb-2">Visible to Tiers:</p>
              <div className="flex flex-wrap gap-2">
                  {deal.tier_access.map(tier => (
                      <TierBadge key={tier} tier={tier} />
                  ))}
              </div>
          </div>
          <Separator />
          <div className="w-full">
              <p className="text-sm font-semibold mb-2">Visible to User Types:</p>
              <div className="flex flex-wrap gap-2">
                  {deal.user_type_access.map(type => (
                      <Badge key={type} variant="outline" className="capitalize">{type}</Badge>
                  ))}
              </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
