
"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import * as React from 'react';
import Image from 'next/image';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Trash2 } from "lucide-react";
import { getCompanyDetails, saveCompanyDetails } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadFileFromFormData } from "@/services/storage-service";

const formSchema = z.object({
  imageFile: z.any().optional(),
});

export function FlightRoutesImageForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | undefined>('');

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      imageFile: undefined,
    },
  });

  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const settings = await getCompanyDetails();
        setCurrentImageUrl(settings.flightRoutesImageUrl);
        setIsLoading(false);
    };
    fetchSettings();
  }, []);



  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      let imageUrl = currentImageUrl;
      const imageFile = values.imageFile?.[0] as File | undefined;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('path', `settings/flight-routes-image.${imageFile.type.split('/')[1]}`);
        imageUrl = await uploadFileFromFormData(formData);
      }

      await saveCompanyDetails({ flightRoutesImageUrl: imageUrl });

      setCurrentImageUrl(imageUrl);
      form.setValue('imageFile', undefined);
      toast({
        title: "Image Saved!",
        description: "The flight routes image has been updated.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Could not save the flight routes image.",
      });
    } finally {
        setIsSaving(false);
    }
  }

  const handleRemoveImage = async () => {
    setIsSaving(true);
     try {
        await saveCompanyDetails({ flightRoutesImageUrl: '' });
        setCurrentImageUrl('');
        toast({
            title: "Image Removed",
            description: "The flight routes image has been removed.",
        });
     } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not remove image."});
     } finally {
        setIsSaving(false);
     }
  }

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <FormField
                    control={form.control}
                    name="imageFile"
                    render={({ field: { value, onChange, ...fieldProps} }) => (
                    <FormItem>
                        <FormLabel>Upload New Image</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...fieldProps} />
                        </FormControl>
                        <FormDescription>
                        Upload an image to show above the flight details on the &quot;How To Get There&quot; page.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div>
                    <FormLabel>Current Image</FormLabel>
                    <div className="mt-2 relative aspect-video w-full max-w-sm rounded-md border bg-muted flex items-center justify-center">
                        {currentImageUrl ? (
                            <Image src={currentImageUrl} alt="Flight routes preview" layout="fill" objectFit="cover" className="rounded-md" referrerPolicy="no-referrer" unoptimized />
                        ) : (
                            <p className="text-muted-foreground text-sm">No Image Set</p>
                        )}
                    </div>
                    {currentImageUrl && (
                        <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={handleRemoveImage} disabled={isSaving}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Image
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Image
                </Button>
            </div>
        </form>
    </Form>
  );
}
