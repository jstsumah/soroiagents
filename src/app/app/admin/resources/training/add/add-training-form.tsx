
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TIERS } from "@/lib/constants";
import type { TrainingCategory, TrainingResource, Tier } from "@/lib/types";
import { uploadFile } from "@/services/storage-service";
import { addTrainingResource, updateTrainingResource } from "@/services/training-resource-service";
import { useTransition } from "react";

const TRAINING_CATEGORIES: TrainingCategory[] = ['general', 'webinar'];

// Base schema for the form fields
const baseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  file: z.any().optional(),
  externalLink: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  category: z.enum(TRAINING_CATEGORIES, { required_error: "Please select a category." }),
  tier_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one tier.",
  }),
});


interface AddTrainingFormProps {
    trainingResource?: TrainingResource;
}

export function AddTrainingForm({ trainingResource }: AddTrainingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const isEditMode = !!trainingResource;

  const formSchema = baseSchema.refine(data => {
    if (isEditMode) {
        // In edit mode, we are valid if there's a new file, a new link, or an existing fileUrl on the resource
        return !!data.file?.[0] || !!data.externalLink || !!trainingResource?.fileUrl;
    }
    // In add mode, we must have a new file or a link
    return !!data.file?.[0] || !!data.externalLink;
  }, {
    message: "You must provide either a file or an external link.",
    path: ["file"],
  });

  
  const form = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: trainingResource?.title || "",
      file: undefined,
      externalLink: trainingResource?.externalLink || "",
      category: trainingResource?.category || 'general',
      tier_access: trainingResource?.tier_access || [],
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  }

  const uploadFileAndGetURL = async (file: File, path: string): Promise<string> => {
    const base64 = await fileToBase64(file);
    return await uploadFile(base64, path, file.type);
  };

  async function onSubmit(values: z.infer<typeof baseSchema>) {
    startSaving(async () => {
        try {
            let fileUrl = trainingResource?.fileUrl || undefined;
            if (values.file && values.file.length > 0) {
                const fileToUpload = values.file[0] as File;
                const uniqueId = new Date().getTime();
                const filePath = `training/${values.category}/${values.title.replace(/\s+/g, '-')}-${uniqueId}/${fileToUpload.name}`;
                fileUrl = await uploadFileAndGetURL(fileToUpload, filePath);
            }

            const resourceData = {
                title: values.title,
                category: values.category,
                tier_access: values.tier_access as Tier[],
                fileUrl: fileUrl,
                externalLink: values.externalLink || undefined,
            };

            if (isEditMode && trainingResource) {
            await updateTrainingResource(trainingResource.id, resourceData);
            } else {
            await addTrainingResource({ ...resourceData, uploaded_at: new Date() });
            }
            
            toast({
                title: isEditMode ? "Training Resource Updated!" : "Training Resource Added!",
                description: "The resource has been successfully saved.",
            });
            router.push('/app/admin/resources/training');
            router.refresh();
        } catch (error) {
            console.error("Error saving training resource:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "An unexpected error occurred while saving the resource."
            });
        }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit" : "Add New"} Training Resource</CardTitle>
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
                    <Input placeholder="e.g., Magical Kenya Travel Specialist Program" {...field} />
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
                  <FormLabel>Resource File</FormLabel>
                   {isEditMode && trainingResource?.fileUrl && <a href={trainingResource.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline block text-sm mb-2">View current file</a>}
                  <FormControl>
                    <Input type="file" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref}/>
                  </FormControl>
                  <FormDescription>{isEditMode ? "Leave blank to keep the existing file." : "Upload a PDF document or video file."}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="externalLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/training-video" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Provide a direct URL to a video or resource.</FormDescription>
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
                      {TRAINING_CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                {isEditMode ? "Save Changes" : "Upload Resource"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
