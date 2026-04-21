
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { TIERS } from "@/lib/constants";
import type { ExclusiveDeal, UserType } from "@/lib/types";
import { uploadFileFromFormData } from "@/services/storage-service";
import { addDeal } from "@/services/deal-service";

const USER_TYPES: UserType[] = ['local', 'international'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  coverImage: z.any()
    .refine(files => files?.length === 1, "A cover image is required.")
    .refine(files => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `Cover image must be less than ${MAX_FILE_SIZE_MB}MB.`),
  pdfFile: z.any()
    .refine(files => files?.length === 1, "A PDF file with details is required.")
    .refine(files => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `PDF file must be less than ${MAX_FILE_SIZE_MB}MB.`),
  valid_until: z.date({
    required_error: "A validity date is required.",
  }),
  tier_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one tier.",
  }),
  user_type_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one user type.",
  }),
  featured: z.boolean().default(false),
});

export function AddDealForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      coverImage: undefined,
      pdfFile: undefined,
      valid_until: undefined,
      tier_access: [],
      user_type_access: [],
      featured: false,
    },
  });

  const uploadFileAndGetURL = async (file: File, path: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    return await uploadFileFromFormData(formData);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const coverImageFile = values.coverImage[0] as File;
      const pdfFile = values.pdfFile[0] as File;

      const [imageUrl, fileUrl] = await Promise.all([
        uploadFileAndGetURL(coverImageFile, `deals/${values.title.replace(/\s+/g, '-')}/cover.jpg`),
        uploadFileAndGetURL(pdfFile, `deals/${values.title.replace(/\s+/g, '-')}/details.pdf`)
      ]);

      const dealData: Omit<ExclusiveDeal, 'id'> = {
        title: values.title,
        description: values.description,
        tier_access: values.tier_access as any,
        user_type_access: values.user_type_access as any,
        valid_until: values.valid_until,
        uploaded_at: new Date(),
        imageUrl,
        fileUrl,
        featured: values.featured,
      };

      await addDeal(dealData);

      toast({
        title: "Exclusive Deal Added!",
        description: "The new deal has been successfully created.",
      });

      router.push('/app/admin/resources/exclusive-deals');
      router.refresh();
    } catch (error) {
       console.error("Error adding deal:", error);
       toast({
        variant: "destructive",
        title: "Error Adding Deal",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exclusive Deal Details</CardTitle>
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
                    <Input placeholder="e.g., Stay 4, Pay 3 at Serengeti Lodge" {...field} />
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
                    <Textarea placeholder="Enter a description for the deal." {...field} />
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
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref} />
                    </FormControl>
                    <FormDescription>The main image displayed on the deal card. Max size: {MAX_FILE_SIZE_MB}MB.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="pdfFile"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                    <FormLabel>PDF Details File</FormLabel>
                    <FormControl>
                        <Input type="file" accept=".pdf" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref} />
                    </FormControl>
                    <FormDescription>The downloadable document with deal specifics. Max size: {MAX_FILE_SIZE_MB}MB.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormDescription>
                        The last date this deal is available for booking.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
             />
            
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="tier_access"
                render={({ field }) => (
                  <FormItem>
                      <div className="mb-4">
                      <FormLabel className="text-base">Tier Access</FormLabel>
                      <FormDescription>
                          Select which agent tiers can access this deal.
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
              <FormField
                control={form.control}
                name="user_type_access"
                render={({ field }) => (
                  <FormItem>
                      <div className="mb-4">
                      <FormLabel className="text-base">User Type Access</FormLabel>
                      <FormDescription>
                          Select which user types can access this deal.
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
                name="featured"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                            Mark as Featured
                        </FormLabel>
                        <FormDescription>
                            Featured deals will be highlighted on the agent dashboard.
                        </FormDescription>
                    </div>
                    </FormItem>
                )}
                />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Deal
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
