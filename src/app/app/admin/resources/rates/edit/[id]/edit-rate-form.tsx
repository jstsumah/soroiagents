
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TIERS } from "@/lib/constants";
import type { Rate, UserType } from "@/lib/types";
import { updateRate } from "@/services/rate-service";
import { uploadFileFromFormData } from "@/services/storage-service";
import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import Image from "next/image";

const USER_TYPES: UserType[] = ['local', 'international'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  coverImage: z.any()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `Cover image must be less than ${MAX_FILE_SIZE_MB}MB.`)
    .optional(),
  pdfFile: z.any()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `PDF file must be less than ${MAX_FILE_SIZE_MB}MB.`)
    .optional(),
  tier_access: z.array(z.string()).optional(),
  user_type_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one user type.",
  }),
  isNett: z.boolean().default(false).optional(),
});

interface EditRateFormProps {
    rate: Rate;
}

const EditRateFormComponent = ({ rate }: EditRateFormProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: rate.title || "",
      description: rate.description || "",
      tier_access: rate.tier_access || [],
      user_type_access: rate.user_type_access || [],
      isNett: rate.isNett || false,
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


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let imageUrl = rate.imageUrl;
      let fileUrl = rate.fileUrl;

      const coverImageFile = values.coverImage?.[0] as File | undefined;
      const pdfFile = values.pdfFile?.[0] as File | undefined;
      
      const uniqueId = new Date().getTime(); 
      const basePath = `rates/${values.title.replace(/\s+/g, '-')}-${uniqueId}`;

      const totalFiles = (coverImageFile ? 1 : 0) + (pdfFile ? 1 : 0);
      let filesUploaded = 0;

      if (coverImageFile) {
        const formData = new FormData();
        formData.append('file', coverImageFile);
        formData.append('path', `${basePath}/cover.jpg`);
        imageUrl = await uploadFileFromFormData(formData);
        filesUploaded++;
        setUploadProgress((filesUploaded/totalFiles) * 100);
      }
      
      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('path', `${basePath}/rate.pdf`);
        fileUrl = await uploadFileFromFormData(formData);
        filesUploaded++;
        setUploadProgress((filesUploaded/totalFiles) * 100);
      }
      
      toast({ title: "Files checked/uploaded.", description: "Updating rate card..." });
      
      const rateData: Partial<Rate> = {
        title: values.title,
        description: values.description,
        tier_access: values.tier_access as any,
        user_type_access: values.user_type_access as any,
        isNett: values.isNett,
        imageUrl,
        fileUrl,
      };

      await updateRate(rate.id, rateData);
      
      toast({
        title: "Rate Card Updated!",
        description: "The rate card has been successfully saved.",
      });

      router.push('/app/admin/resources/rates');
      router.refresh();

    } catch (error) {
      console.error("Error updating rate card:", error);
      toast({
        variant: "destructive",
        title: "Error Updating Rate Card",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
        setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Card Details</CardTitle>
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
                    <Input placeholder="e.g., 2025 Contracted Rates (Non-Resident)" {...field} disabled={isUploading}/>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter a description that will appear on the rate card." {...field} disabled={isUploading}/>
                  </FormControl>
                   <FormDescription>
                    You can use Markdown for formatting (e.g., **bold**, *italic*, - list item).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-8">
                <FormField
                control={form.control}
                name="coverImage"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                     {rate.imageUrl && <div className="relative h-24 w-24"><Image src={rate.imageUrl} alt="Current Cover" layout="fill" objectFit="cover" className="rounded-md" referrerPolicy="no-referrer" unoptimized /></div>}
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref} disabled={isUploading}/>
                    </FormControl>
                    <FormDescription>Upload a new image to replace the current one. Max size: {MAX_FILE_SIZE_MB}MB.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="pdfFile"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                    <FormLabel>PDF Rate File</FormLabel>
                    {rate.fileUrl && <a href={rate.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline block text-sm">View current PDF</a>}
                    <FormControl>
                        <Input type="file" accept=".pdf" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref} disabled={isUploading}/>
                    </FormControl>
                    <FormDescription>Upload a new PDF to replace the current one. Max size: {MAX_FILE_SIZE_MB}MB.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="tier_access"
                render={({ field }) => (
                  <FormItem>
                      <div className="mb-4">
                      <FormLabel className="text-base">Tier Access</FormLabel>
                      <FormDescription>
                          Select which agent tiers can access this rate card. Leave blank for draft mode.
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
                                  disabled={isUploading}
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
              <FormField
                control={form.control}
                name="user_type_access"
                render={({ field }) => (
                  <FormItem>
                      <div className="mb-4">
                      <FormLabel className="text-base">User Type Access</FormLabel>
                      <FormDescription>
                          Select which user types can access this rate card.
                      </FormDescription>
                      </div>
                      <div className="flex flex-wrap gap-4">
                      {USER_TYPES.map((item) => (
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
                                  disabled={isUploading}
                              />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">
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
             <FormField
                control={form.control}
                name="isNett"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isUploading}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                            Rates are Nett & Non-Commissionable
                        </FormLabel>
                        <FormDescription>
                           If checked, the &quot;All rates are Nett and Non-Commissionable&quot; text will appear on the card.
                        </FormDescription>
                    </div>
                    </FormItem>
                )}
                />
            
            {isUploading && (
                <div className="space-y-2">
                    <Label>Upload Progress</Label>
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
                </div>
            )}


            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isUploading}>Cancel</Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploading ? "Uploading..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export const EditRateForm = React.memo(EditRateFormComponent);
