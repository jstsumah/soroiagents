
"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Trash2 } from "lucide-react";
import { getPromotionCardSettings, savePromotionCardSettings } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadFile } from "@/lib/upload-utils";
import Image from "next/image";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").optional().or(z.literal('')),
  description: z.string().min(10, "Description must be at least 10 characters.").optional().or(z.literal('')),
  linkType: z.enum(['url', 'file']).default('url'),
  link: z.string().optional(),
  linkFile: z.any().optional(),
  imageFile: z.any().optional(),
}).refine(data => {
    if (data.linkType === 'url') {
        return !data.link || z.string().url().safeParse(data.link).success;
    }
    return true;
}, {
    message: "Please enter a valid URL.",
    path: ["link"],
});

export function PromotionCardForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | undefined>('');
  const [currentLink, setCurrentLink] = React.useState<string | undefined>('');


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      linkType: 'url',
      link: "",
      linkFile: undefined,
      imageFile: undefined,
    },
  });
  
  const linkType = useWatch({ control: form.control, name: 'linkType' });

  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const settings = await getPromotionCardSettings();
        form.reset({ 
            title: settings.title || '',
            description: settings.description || '',
            link: settings.link || '',
            linkType: settings.linkType || 'url',
        });
        setCurrentImageUrl(settings.imageUrl);
        setCurrentLink(settings.link);
        setIsLoading(false);
    };
    fetchSettings();
  }, [form]);



  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      let imageUrl = currentImageUrl;
      let linkUrl = values.link;

      const imageFile = values.imageFile?.[0] as File | undefined;
      const linkFile = values.linkFile?.[0] as File | undefined;
      
      if (imageFile) {
        const path = `settings/promotion-card-image.${imageFile.type.split('/')[1]}`;
        imageUrl = await uploadFile(imageFile, path);
      }

      if (values.linkType === 'file' && linkFile) {
          const path = `settings/promotion-file-${linkFile.name}`;
          linkUrl = await uploadFile(linkFile, path);
      }

      await savePromotionCardSettings({ 
        title: values.title,
        description: values.description,
        link: linkUrl,
        linkType: values.linkType,
        imageUrl,
       });

      setCurrentImageUrl(imageUrl);
      setCurrentLink(linkUrl);
      form.setValue('imageFile', undefined);
      form.setValue('linkFile', undefined);

      toast({
        title: "Promotion Saved!",
        description: "The promotion card has been updated.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Could not save the promotion card.",
      });
    } finally {
        setIsSaving(false);
    }
  }

  const handleRemoveImage = async () => {
    setIsSaving(true);
    try {
        await savePromotionCardSettings({ imageUrl: '' });
        setCurrentImageUrl('');
        toast({ title: "Image Removed", description: "The promotion card image has been removed." });
    } catch(e) {
        toast({ variant: 'destructive', title: "Error", description: "Could not remove image." });
    } finally {
        setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Promotion Title</FormLabel>
                    <FormControl>
                        <Input placeholder='e.g., Early Bird Special' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Promotion Description</FormLabel>
                    <FormControl>
                        <Textarea 
                            placeholder='Describe the promotion or news alert...'
                            className="min-h-[100px]"
                            {...field}
                            />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="linkType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Link Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="url" /></FormControl>
                        <FormLabel className="font-normal">Link URL</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="file" /></FormControl>
                        <FormLabel className="font-normal">File Upload</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {linkType === 'url' ? (
                <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Link URL (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder='https://example.com/special-offer' {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>When a user clicks the card, they will be taken to this URL.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            ) : (
                 <FormField
                    control={form.control}
                    name="linkFile"
                    render={({ field: { value, onChange, ...fieldProps} }) => (
                    <FormItem>
                        <FormLabel>Upload File</FormLabel>
                        {currentLink && form.getValues('linkType') === 'file' && <a href={currentLink} target="_blank" rel="noreferrer" className="text-primary hover:underline block text-sm">View current file</a>}
                        <FormControl>
                            <Input type="file" onChange={e => onChange(e.target.files)} {...fieldProps} />
                        </FormControl>
                         <FormDescription>When a user clicks the card, this file will be downloaded.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <FormField
                    control={form.control}
                    name="imageFile"
                    render={({ field: { value, onChange, ...fieldProps} }) => (
                    <FormItem>
                        <FormLabel>Upload Image (Optional)</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...fieldProps} />
                        </FormControl>
                        <FormDescription>
                        Upload a new image to replace the current one.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div>
                    <FormLabel>Current Image</FormLabel>
                    <div className="mt-2 relative aspect-video w-full max-w-sm rounded-md border bg-muted flex items-center justify-center">
                        {currentImageUrl ? (
                            <Image src={currentImageUrl} alt="Promotion card preview" layout="fill" objectFit="cover" className="rounded-md" referrerPolicy="no-referrer" unoptimized />
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
                Save Promotion
                </Button>
            </div>
        </form>
    </Form>
  );
}
