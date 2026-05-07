
"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from 'react';
import Image from "next/image";
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
import { uploadFile } from "@/lib/upload-utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  loginBgType: z.enum(['image', 'color']).default('image'),
  loginBgUrl: z.string().url().optional().or(z.literal('')),
  loginBgColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color").optional().or(z.literal('')),
  imageFile: z.any().optional(),
});

export function LoginBackgroundForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | undefined>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginBgType: 'image',
      loginBgUrl: "",
      loginBgColor: "#E9E8E7",
      imageFile: undefined,
    },
  });
  
  const bgType = useWatch({
    control: form.control,
    name: 'loginBgType',
  });
  
  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const settings = await getCompanyDetails();
        form.reset({ 
            loginBgUrl: settings.loginBgUrl || '',
            loginBgType: settings.loginBgType || 'image',
            loginBgColor: settings.loginBgColor || '#E9E8E7',
        });
        setCurrentImageUrl(settings.loginBgUrl);
        setIsLoading(false);
    };
    fetchSettings();
  }, [form]);



  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      let imageUrl = currentImageUrl;
      const imageFile = values.imageFile?.[0] as File | undefined;

      if (imageFile) {
        const path = `settings/login-background.${imageFile.type.split('/')[1]}`;
        imageUrl = await uploadFile(imageFile, path);
      }

      await saveCompanyDetails({ 
          loginBgType: values.loginBgType,
          loginBgUrl: imageUrl,
          loginBgColor: values.loginBgColor,
      });

      setCurrentImageUrl(imageUrl);
      form.setValue('imageFile', undefined);
      toast({
        title: "Background Saved!",
        description: "The login page background has been updated.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Could not save the login page background.",
      });
    } finally {
        setIsSaving(false);
    }
  }

  const handleRemoveImage = async () => {
    setIsSaving(true);
     try {
        await saveCompanyDetails({ loginBgUrl: '' });
        setCurrentImageUrl('');
        form.reset({ ...form.getValues(), loginBgUrl: '' });
        toast({
            title: "Background Removed",
            description: "The login page background image has been removed.",
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
            <FormField
              control={form.control}
              name="loginBgType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Background Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="image" />
                        </FormControl>
                        <FormLabel className="font-normal">Image</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="color" />
                        </FormControl>
                        <FormLabel className="font-normal">Solid Color</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {bgType === 'image' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <FormField
                        control={form.control}
                        name="imageFile"
                        render={({ field: { value, onChange, ...fieldProps} }) => (
                        <FormItem>
                            <FormLabel>Upload New Background Image</FormLabel>
                            <FormControl>
                                <Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...fieldProps} />
                            </FormControl>
                            <FormDescription>
                            Upload a new image to replace the current one. Recommended size: 1920x1080px.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div>
                        <FormLabel>Current Background</FormLabel>
                        <div className="mt-2 relative aspect-video w-full max-w-sm rounded-md border bg-muted flex items-center justify-center">
                            {currentImageUrl ? (
                                <Image src={currentImageUrl} alt="Login background preview" layout="fill" objectFit="cover" className="rounded-md" referrerPolicy="no-referrer" unoptimized />
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
            )}

            {bgType === 'color' && (
                 <FormField
                    control={form.control}
                    name="loginBgColor"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <div className="flex items-center gap-2">
                             <FormControl>
                                <Input placeholder="#RRGGBB" {...field} value={field.value ?? ''} />
                            </FormControl>
                             <div className="h-10 w-16 rounded-md border" style={{ backgroundColor: field.value }}></div>
                        </div>
                       
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Background
                </Button>
            </div>
        </form>
    </Form>
  );
}
