
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Map, ImageIcon, FileQuestion, Video, Activity, MoreVertical, Loader2, HeartPulse } from "lucide-react";
import type { Resource } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState } from "react";

const categoryIcons = {
  rates: <FileText className="h-full w-full" />,
  itineraries: <Map className="h-full w-full" />,
  brochures: <FileQuestion className="h-full w-full" />,
  images: <ImageIcon className="h-full w-full" />,
  factsheet: <FileText className="h-full w-full" />,
  videos: <Video className="h-full w-full" />,
  'activity-sheets': <Activity className="h-full w-full" />,
  'spa-menu': <HeartPulse className="h-full w-full" />,
  // Add other categories as needed
  deals: <FileText className="h-full w-full" />,
  'park-fees': <FileText className="h-full w-full" />,
  'how-to-get-there': <FileText className="h-full w-full" />,
  training: <FileText className="h-full w-full" />,
};

interface ResourceCardProps {
  resource: Resource;
  onEdit?: (id: string) => void;
  onDelete?: (resource: Resource) => void;
}


export function ResourceCard({ resource, onEdit, onDelete }: ResourceCardProps) {
  const icon = categoryIcons[resource.category];
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = () => {
    if (!onDelete) return;
    setIsDeleting(true);
    onDelete(resource);
    // The parent component will handle the actual deletion and closing logic
  }

  const showAdminActions = onEdit || onDelete;

  return (
    <>
    {onDelete && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the resource &quot;{resource.title}&quot;.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Yes, delete it
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="p-0 relative">
        {showAdminActions && (
             <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onEdit && <DropdownMenuItem onClick={() => onEdit(resource.id)}>Edit</DropdownMenuItem>}
                      {onDelete && <DropdownMenuSeparator />}
                      {onDelete && <DropdownMenuItem onClick={() => setIsAlertOpen(true)} className="text-destructive">Delete</DropdownMenuItem>}
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
        )}
        <div className="relative aspect-video bg-muted/40">
           {resource.imageUrl ? (
              <Image 
                src={resource.imageUrl}
                alt={resource.title}
                fill
                objectFit="cover"
                data-ai-hint="safari landscape"
                referrerPolicy="no-referrer"
                unoptimized
              />
           ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/50 p-8">
              {icon}
            </div>
           )}
        </div>
        <div className="p-6 pb-2">
            <Badge variant="secondary" className="mb-2 capitalize">{resource.category.replace('-', ' ')}</Badge>
            <CardTitle className="text-lg leading-snug">{resource.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pt-0 pb-4">
        <div className="text-base prose prose-sm max-w-none text-muted-foreground line-clamp-5">
            <p>{resource.description}</p>
        </div>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-0">
        <Button asChild className="w-full">
          <a href={resource.file_url} download target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-[18px] w-[18px]" />
            Download
          </a>
        </Button>
      </CardFooter>
    </Card>
    </>
  );
}

    