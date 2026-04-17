
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TIERS, CATEGORIES } from "@/lib/constants";
import type { Tier, Category, Resource } from "@/lib/types";
import { uploadFile } from "@/services/storage-service";
import { updateResource } from "@/services/resource-service";
import { useRouter } from "next/navigation";
import * as React from 'react';
import Image from "next/image";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  file: z.any().optional(),
  coverImage: z.any().optional(),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  category: z.enum(CATEGORIES, { required_error: "Please select a category." }),
  tier_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one tier.",
  }),
});

interface EditResourceFormProps {
    resource: Resource;
}

const EditResourceFormComponent = ({ resource }: EditResourceFormProps) => {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        ...resource,
        file: undefined,
        coverImage: undefined,
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  const uploadFileAndGetURL = async (file: File, path: string): Promise<string> => {
    const base64 = await fileToBase64(file);
    return await uploadFile(base64, path, file.type);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let fileUrl = resource.file_url;
      let imageUrl = resource.imageUrl;
      const basePath = `resources/${values.category}/${values.title.replace(/\s+/g, '-')}`;

      if (values.file && values.file.length > 0) {
        const fileToUpload = values.file[0] as File;
        fileUrl = await uploadFileAndGetURL(fileToUpload, `${basePath}/${fileToUpload.name}`);

        // If it's an image resource and no separate cover image is uploaded, the main file is the image.
        if (values.category === 'images' && (!values.coverImage || values.coverImage.length === 0)) {
            imageUrl = fileUrl;
        }
      }

      if (values.coverImage && values.coverImage.length > 0) {
        const coverImageFile = values.coverImage[0] as File;
        imageUrl = await uploadFileAndGetURL(coverImageFile, `${basePath}/cover-${coverImageFile.name}`);
      }

      const resourceData: Partial<Resource> = {
        title: values.title,
        description: values.description,
        category: values.category,
        tier_access: values.tier_access as Tier[],
        file_url: fileUrl,
        imageUrl: imageUrl,
      };

      await updateResource(resource.id, resourceData);

      toast({
        title: "Resource Updated!",
        description: "The resource has been successfully saved.",
      });
      router.push('/app/admin/resources/downloads');
      router.refresh();
    } catch (error) {
       console.error("Error updating resource:", error);
       toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Resource</CardTitle>
        <CardDescription>Modify the details for &quot;{resource.title}&quot;</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 2024 Safari Rates" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, onBlur, name, ref } }) => (
                <FormItem>
                  <FormLabel>Replace Resource File (Optional)</FormLabel>
                  <FormControl>
                    <Input type="file" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref}/>
                  </FormControl>
                   <FormDescription>
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View current file.</a>
                     Upload a new file to replace it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field: { onChange, onBlur, name, ref } }) => (
                <FormItem>
                  <FormLabel>Replace Cover Image (Optional)</FormLabel>
                  {resource.imageUrl && (
                      <div className="relative h-24 w-24 border rounded-md">
                        <Image src={resource.imageUrl} alt="Current cover image" fill objectFit="cover" className="rounded-md" referrerPolicy="no-referrer" unoptimized />
                      </div>
                  )}
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref}/>
                  </FormControl>
                   <FormDescription>
                     Upload a new image to replace the existing cover image.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief description of the resource." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat.replace('-', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tier_access"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Tier Access</FormLabel>
                    <FormDescription>
                      Select which agent tiers can access this resource.
                    </FormDescription>
                  </div>
                  <div className="flex flex-wrap gap-4">
                  {TIERS.map((item) => (
                    <FormItem
                      key={item}
                      className="flex flex-row items-start space-x-3 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), item])
                              : field.onChange(
                                  field.value?.filter(
                                    (value) => value !== item
                                  )
                                )
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {item}
                      </FormLabel>
                    </FormItem>
                  ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export const EditResourceForm = React.memo(EditResourceFormComponent);
