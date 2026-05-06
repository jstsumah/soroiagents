
"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTransition, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { suggestResourceMetadata } from "@/ai/flows/suggest-resource-metadata";
import { TIERS } from "@/lib/constants";
import type { Tier, Category, Resource } from "@/lib/types";
import { uploadFileFromFormData } from "@/services/storage-service";
import { addResource } from "@/services/resource-service";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Exclude categories that have their own dedicated pages from the dropdown
const DOWNLOAD_CATEGORIES: Category[] = ['brochures', 'images', 'factsheet', 'videos', 'activity-sheets', 'itineraries', 'spa-menu'];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  sourceType: z.enum(['upload', 'link']).default('upload'),
  file: z.any().optional(),
  externalLink: z.string().optional(),
  coverImage: z.any().optional(),
  contentForAi: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  category: z.enum(DOWNLOAD_CATEGORIES, { required_error: "Please select a category." }),
  tier_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one tier.",
  }),
}).refine(data => {
    if (data.sourceType === 'upload') return !!data.file?.[0];
    if (data.sourceType === 'link') return !!data.externalLink && z.string().url().safeParse(data.externalLink).success;
    return false;
}, {
    message: "A file must be uploaded or a valid URL must be provided.",
    path: ["file"],
});

interface ResourceUploadFormProps {
    isItinerary?: boolean;
}

export function ResourceUploadForm({ isItinerary = false }: ResourceUploadFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      sourceType: "upload",
      file: undefined,
      externalLink: "",
      coverImage: undefined,
      contentForAi: "",
      description: "",
      category: isItinerary ? "itineraries" : "brochures",
      tier_access: [],
    },
  });

  useEffect(() => {
    if (isItinerary) {
      form.setValue('category', 'itineraries');
    }
  }, [isItinerary, form]);


  const contentForAi = useWatch({ control: form.control, name: 'contentForAi' });
  const sourceType = useWatch({ control: form.control, name: 'sourceType' });

  const handleSuggestMetadata = () => {
    const content = form.getValues("contentForAi");
    if (!content) {
      toast({
        variant: "destructive",
        title: "Content for AI is empty",
        description: "Please paste some content to generate metadata.",
      });
      return;
    }

    startTransition(async () => {
      const result = await suggestResourceMetadata({ resourceContent: content });
      if (result) {
        form.setValue("description", result.description, { shouldValidate: true });
        if (DOWNLOAD_CATEGORIES.includes(result.category)) {
          form.setValue("category", result.category as any, { shouldValidate: true });
        }
        // Tags are not in the form schema but could be added
        toast({
          title: "Metadata Suggested!",
          description: "Description and category have been filled in.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "AI Suggestion Failed",
          description: "Could not generate metadata. Please try again.",
        });
      }
    });
  };

  const uploadFileAndGetURL = async (file: File, path: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    return await uploadFileFromFormData(formData);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let fileUrl = "";
      
      if (values.sourceType === 'upload') {
        const fileToUpload = values.file[0] as File;
        const basePath = `resources/${values.category}/${values.title.replace(/\s+/g, '-')}`;
        fileUrl = await uploadFileAndGetURL(fileToUpload, `${basePath}/${fileToUpload.name}`);
      } else {
        fileUrl = values.externalLink!;
      }

      const coverImageFile = values.coverImage?.[0] as File;
      let imageUrl: string | undefined = undefined;
      
      if (coverImageFile) {
        const basePath = `resources/${values.category}/${values.title.replace(/\s+/g, '-')}`;
        imageUrl = await uploadFileAndGetURL(coverImageFile, `${basePath}/cover-${coverImageFile.name}`);
      } else if (values.category === 'images') {
        imageUrl = fileUrl; // For images, the file itself is the cover if none is provided.
      }

      const resourceData: Omit<Resource, 'id'> = {
        title: values.title,
        description: values.description,
        category: values.category,
        tier_access: values.tier_access as Tier[],
        file_url: fileUrl,
        imageUrl: imageUrl,
        uploaded_at: new Date(),
      };

      await addResource(resourceData);

      toast({
        title: "Resource Submitted!",
        description: "The new resource has been created.",
      });
      form.reset();
      const redirectUrl = isItinerary ? '/app/admin/resources/packaged-its' : '/app/admin/resources/downloads';
      router.push(redirectUrl);
      router.refresh();
    } catch (error: any) {
       console.error("Error uploading resource:", error);
       toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Resource</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-8">
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
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Resource Source</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="upload" />
                            </FormControl>
                            <FormLabel className="font-normal">File Upload</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="link" />
                            </FormControl>
                            <FormLabel className="font-normal">External Link</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {sourceType === 'upload' ? (
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, onBlur, name, ref } }) => (
                      <FormItem>
                        <FormLabel>Resource File</FormLabel>
                        <FormControl>
                          <Input type="file" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="externalLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>External URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://wetu.com/..." {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormDescription>Provide a direct URL to the resource.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                      <FormLabel>Cover Image (Optional)</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref}/>
                      </FormControl>
                      <FormDescription>A cover image for the resource card. If category is &apos;images&apos; and this is empty, the image itself will be used.</FormDescription>
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
                      <FormDescription>
                        You can use Markdown for formatting (e.g., **bold**, *italic*, - list item).
                      </FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isItinerary}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOWNLOAD_CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat === 'factsheet' ? 'Fact Sheet' : cat.replace('-', ' ')}</SelectItem>)}
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
              </div>

              <div className="space-y-4 rounded-lg bg-muted/50 p-6">
                <FormField
                  control={form.control}
                  name="contentForAi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">AI Metadata Suggester</FormLabel>
                       <FormDescription>
                        Paste some content from your resource (e.g., text from a brochure) to get AI-powered suggestions for description and category.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Paste resource content here..."
                          className="resize-y min-h-[200px] bg-background"
                          {...field}
                        />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuggestMetadata}
                  disabled={isPending || !contentForAi}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-[18px] w-[18px]" />
                  )}
                  Suggest with AI
                </Button>
              </div>
            </div>

            <div className="flex w-full gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} className="w-1/2">Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-1/2">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                Upload Resource
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
