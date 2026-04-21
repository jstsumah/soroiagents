

"use client";

import * as React from 'react';
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Skeleton } from "@/components/ui/skeleton";
import { uploadFileFromFormData } from "@/services/storage-service";
import { getPopupBannerSettings, savePopupBannerSettings } from "@/services/settings-service";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { settingsEmitter } from '@/components/settings-emitter';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  imageUrl: z.string().url().optional().or(z.literal('')),
  buttonText: z.string().optional(),
  buttonLink: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  position: z.enum(['bottom-left', 'bottom-right', 'center-left', 'center-right']),
  visibility: z.enum(['everyone', 'logged-in', 'logged-out']),
  duration: z.coerce.number().min(0, "Duration must be a positive number."),
  displayFrequency: z.enum(['session', 'day', 'once', 'always', 'every_x_days']),
  displayFrequencyDays: z.coerce.number().min(1, "Must be at least 1 day.").optional(),
  imageFile: z.any().optional(),
}).refine(data => {
    if (data.displayFrequency === 'every_x_days') {
        return !!data.displayFrequencyDays && data.displayFrequencyDays > 0;
    }
    return true;
}, {
    message: "Please specify the number of days.",
    path: ['displayFrequencyDays'],
}).refine(data => {
    if (data.buttonText && !data.buttonLink) {
        return false;
    }
    return true;
}, {
    message: "A link URL is required if you provide button text.",
    path: ['buttonLink'],
});

export function PopupBannerForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        enabled: false,
        title: '',
        description: '',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        position: 'bottom-right',
        visibility: 'everyone',
        duration: 15,
        displayFrequency: 'session',
        displayFrequencyDays: 7,
        imageFile: undefined,
    },
  });

  const currentImageUrl = useWatch({ control: form.control, name: 'imageUrl' });
  const displayFrequency = useWatch({ control: form.control, name: 'displayFrequency' });

  React.useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const settings = await getPopupBannerSettings();
      form.reset(settings);
      setIsLoading(false);
    };
    fetchSettings();
  }, [form]);



  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      let imageUrlToSave = values.imageUrl;
      const imageFile = values.imageFile?.[0] as File | undefined;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('path', `settings/popup-banner-image.${imageFile.type.split('/')[1]}`);
        imageUrlToSave = await uploadFileFromFormData(formData);
      }
      
      const settingsToSave = { ...values, imageUrl: imageUrlToSave, imageFile: undefined };
      await savePopupBannerSettings(settingsToSave);

      form.reset(settingsToSave); // Reset form with the newly saved data
      
      toast({
        title: "Popup Banner Saved!",
        description: "The popup banner settings have been updated.",
      });

      // Notify other components that settings have changed
      settingsEmitter.emit();

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the popup banner settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  const handleRemoveImage = async () => {
      form.setValue('imageUrl', '');
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Popup Banner</FormLabel>
                <FormDescription>
                  Turn this on to display the popup to users.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <Separator />

        <div className="grid md:grid-cols-2 gap-6">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="e.g., New Feature Alert!" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Briefly describe the announcement." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <FormField control={form.control} name="imageFile" render={({ field: { value, onChange, ...fieldProps} }) => (
                <FormItem>
                    <FormLabel>Upload Image (Optional)</FormLabel>
                    <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                    <FormDescription>Upload an image for the popup banner.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />
            <div>
                <FormLabel>Current Image</FormLabel>
                <div className="mt-2 relative aspect-video w-full max-w-sm rounded-md border bg-muted flex items-center justify-center">
                    {currentImageUrl ? (
                        <Image src={currentImageUrl} alt="Popup banner preview" layout="fill" objectFit="cover" className="rounded-md" referrerPolicy="no-referrer" unoptimized />
                    ) : (
                        <p className="text-muted-foreground text-sm">No Image Set</p>
                    )}
                </div>
                {currentImageUrl && (
                    <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={handleRemoveImage} disabled={isSaving}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove Image
                    </Button>
                )}
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
             <FormField control={form.control} name="buttonText" render={({ field }) => (
                <FormItem>
                    <FormLabel>Button Text (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Learn More" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="buttonLink" render={({ field }) => (
                <FormItem>
                    <FormLabel>Button Link URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com/new-feature" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        
        <Separator />
        
        <div className="grid md:grid-cols-2 gap-6">
            <FormField control={form.control} name="position" render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-x-4 gap-y-2">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="bottom-right" /></FormControl>
                                <FormLabel className="font-normal">Bottom Right</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="bottom-left" /></FormControl>
                                <FormLabel className="font-normal">Bottom Left</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="center-right" /></FormControl>
                                <FormLabel className="font-normal">Center Right</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="center-left" /></FormControl>
                                <FormLabel className="font-normal">Center Left</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )} />
             <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                    <FormLabel>Auto-Close Duration</FormLabel>
                    <FormControl><Input type="number" placeholder="15" {...field} /></FormControl>
                    <FormDescription>Seconds before the popup closes automatically. Set to 0 to disable.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        
        <FormField control={form.control} name="visibility" render={({ field }) => (
            <FormItem className="space-y-3">
                <FormLabel>Visibility</FormLabel>
                 <FormDescription>Choose who should see this popup banner.</FormDescription>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="everyone" /></FormControl>
                            <FormLabel className="font-normal">Everyone</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="logged-in" /></FormControl>
                            <FormLabel className="font-normal">Logged-in Users Only</FormLabel>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="logged-out" /></FormControl>
                            <FormLabel className="font-normal">Logged-out Users Only</FormLabel>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
                 <FormMessage />
            </FormItem>
        )} />

        <FormField control={form.control} name="displayFrequency" render={({ field }) => (
            <FormItem className="space-y-3">
                <FormLabel>Display Frequency</FormLabel>
                 <FormDescription>Choose how often to show the popup to a user.</FormDescription>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-start">
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="always" /></FormControl><FormLabel className="font-normal">Always</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="session" /></FormControl><FormLabel className="font-normal">Once per session</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="day" /></FormControl><FormLabel className="font-normal">Once per day</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="once" /></FormControl><FormLabel className="font-normal">Only once ever</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="every_x_days" /></FormControl><FormLabel className="font-normal">Every X Days</FormLabel></FormItem>
                    </RadioGroup>
                </FormControl>
                {displayFrequency === 'every_x_days' && (
                    <div className="pl-6 pt-2">
                        <FormField control={form.control} name="displayFrequencyDays" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Days</FormLabel>
                                <FormControl><Input type="number" placeholder="7" {...field} className="w-32" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                 <FormMessage />
            </FormItem>
        )} />


        <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Popup Settings
            </Button>
        </div>
      </form>
    </Form>
  );
}
