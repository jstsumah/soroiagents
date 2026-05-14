

"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TIERS } from "@/lib/constants";
import type { PackagedItinerary, UserType, ItineraryPackage, TravelLink } from "@/lib/types";
import { addItinerary, updateItinerary } from "@/services/itinerary-service";
import { deleteFile } from "@/services/storage-service";
import * as React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { uploadFile } from "@/lib/upload-utils";

const USER_TYPES: UserType[] = ['local', 'international'];

const travelLinkSchema = z.object({
  type: z.enum(['url', 'file']).default('url'),
  value: z.string().optional(),
  file: z.any().optional(),
});

const packageSchema = z.object({
  name: z.string().min(3, "Package name is required."),
  driveIn: travelLinkSchema,
  flyIn: travelLinkSchema,
  railSafari: travelLinkSchema,
}).superRefine((data, ctx) => {
    const checkTravelLink = (link: z.infer<typeof travelLinkSchema>, fieldName: string) => {
        if (link.type === 'url' && (!link.value || !z.string().url().safeParse(link.value).success)) {
            // Allow N/A as a valid string
            if (link.value?.toUpperCase() !== 'N/A') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Please enter 'N/A' or a valid URL.",
                    path: [fieldName, 'value'],
                });
            }
        }
    };
    checkTravelLink(data.driveIn, 'driveIn');
    checkTravelLink(data.flyIn, 'flyIn');
    checkTravelLink(data.railSafari, 'railSafari');
});


const formSchema = z.object({
  title: z.string().min(3, "Title is required."),
  commissionInfo: z.string().min(3, "Commission info is required."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  notes: z.string().optional(),
  featured: z.boolean().default(false),
  isNetPackage: z.boolean().default(false),
  packages: z.array(packageSchema).min(1, "At least one package is required."),
  tier_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one tier.",
  }),
  user_type_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one user type.",
  }),
});

interface ItineraryFormProps {
    itinerary?: PackagedItinerary;
}

const ItineraryFormComponent = ({ itinerary }: ItineraryFormProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!itinerary;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && itinerary ? {
        ...itinerary,
        isNetPackage: itinerary.isNetPackage || false,
        packages: itinerary.packages.map(p => ({
            ...p,
            driveIn: {...p.driveIn, file: undefined},
            flyIn: {...p.flyIn, file: undefined},
            railSafari: {...p.railSafari, file: undefined},
        }))
    } : {
      title: "",
      commissionInfo: "",
      description: "",
      notes: "",
      featured: false,
      isNetPackage: false,
      packages: [{ 
          name: "", 
          driveIn: { type: 'url', value: 'N/A' }, 
          flyIn: { type: 'url', value: 'N/A' }, 
          railSafari: { type: 'url', value: 'N/A' } 
      }],
      tier_access: [],
      user_type_access: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });
  
  const uploadFileAndGetURL = async (file: File, path: string): Promise<string> => {
    return uploadFile(file, path);
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
       const processedPackages = await Promise.all(
        values.packages.map(async (pkg, index) => {
          const processTravelLink = async (link: z.infer<typeof travelLinkSchema>, travelType: string): Promise<TravelLink> => {
            const originalLink = itinerary?.packages[index]?.[travelType as keyof ItineraryPackage] as TravelLink | undefined;

            if (link.type === 'file') {
              if (link.file?.[0]) {
                const file = link.file[0] as File;
                const timestamp = Date.now();
                const path = `itineraries/${values.title.replace(/\s+/g, '-')}/package-${index}/${travelType}-${timestamp}-${file.name}`;
                
                // If edit mode and old file exists, delete it
                if (isEditMode && originalLink && originalLink.type === 'file' && originalLink.value) {
                    await deleteFile(originalLink.value);
                }

                const url = await uploadFileAndGetURL(file, path);
                return { type: 'file', value: url };
              }
              // If no new file is uploaded in edit mode, keep the old one if it exists and was a file link
              if (isEditMode && originalLink && originalLink.type === 'file') {
                return originalLink;
              }
            }
            // For URL type, or if file was chosen but nothing uploaded
            return { type: 'url', value: link.value || 'N/A' };
          };

          return {
            name: pkg.name,
            driveIn: await processTravelLink(pkg.driveIn, 'driveIn'),
            flyIn: await processTravelLink(pkg.flyIn, 'flyIn'),
            railSafari: await processTravelLink(pkg.railSafari, 'railSafari'),
          };
        })
      );
      
      const itineraryData: Omit<PackagedItinerary, 'id'> = {
          title: values.title,
          commissionInfo: values.commissionInfo,
          description: values.description,
          notes: values.notes || "",
          featured: values.featured || false,
          isNetPackage: values.isNetPackage || false,
          packages: processedPackages,
          tier_access: values.tier_access as any,
          user_type_access: values.user_type_access as any,
          uploaded_at: isEditMode && itinerary ? itinerary.uploaded_at : new Date(),
      };


      if (isEditMode && itinerary) {
         await updateItinerary(itinerary.id, itineraryData);
         toast({
            title: "Itinerary Updated!",
            description: "The packaged itinerary has been successfully updated.",
          });
      } else {
        await addItinerary(itineraryData);
        toast({
            title: "Itinerary Added!",
            description: "The new packaged itinerary has been successfully created.",
        });
      }

      router.push('/app/admin/resources/packaged-its');
      router.refresh();
    } catch (error: any) {
      console.error("Error saving itinerary:", error);
      toast({
        variant: "destructive",
        title: "Error saving itinerary",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
  }

  const TravelLinkInput = ({ pkgIndex, fieldName }: { pkgIndex: number, fieldName: "driveIn" | "flyIn" | "railSafari" }) => {
    const type = useWatch({
      control: form.control,
      name: `packages.${pkgIndex}.${fieldName}.type`,
    });
    
    const originalLink = itinerary?.packages[pkgIndex]?.[fieldName as keyof ItineraryPackage] as TravelLink | undefined;

    const label = fieldName === 'driveIn' ? 'Drive-In' : fieldName === 'flyIn' ? 'Fly-In' : 'Rail Safari';
    
    return (
      <div className="space-y-2">
        <FormLabel className="text-sm">{label}</FormLabel>
        <FormField
          control={form.control}
          name={`packages.${pkgIndex}.${fieldName}.type`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-2">
                  <FormItem className="flex items-center space-x-1 space-y-0">
                    <FormControl><RadioGroupItem value="url" /></FormControl>
                    <FormLabel className="text-xs font-normal">Link</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-1 space-y-0">
                    <FormControl><RadioGroupItem value="file" /></FormControl>
                    <FormLabel className="text-xs font-normal">File</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
        {type === 'url' ? (
          <FormField
            control={form.control}
            name={`packages.${pkgIndex}.${fieldName}.value`}
            render={({ field }) => (
              <FormItem>
                <FormControl><Input placeholder="https://... or N/A" {...field} value={field.value ?? ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-2">
            {isEditMode && originalLink?.type === 'file' && originalLink.value && (
                <a href={originalLink.value} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline block">View current file</a>
            )}
            <FormField
              control={form.control}
              name={`packages.${pkgIndex}.${fieldName}.file`}
              render={({ field: { onChange, value, ...fieldProps } }) => (
                <FormItem>
                  <FormControl><Input type="file" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Itinerary Details</CardTitle>
        <CardDescription>
          {isEditMode ? `Modify details for ${itinerary.title}`: "Define the details for the new packaged itinerary."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                     <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., KENYA RESIDENT KES PACKAGES..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="commissionInfo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Commission Info</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., COMMISSIONABLE AT 15%*" {...field} />
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
                            <FormLabel>Short Description</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Short 2nt packages from Nairobi" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Provide any additional notes or details here." {...field} />
                            </FormControl>
                            <FormDescription>
                                You can use Markdown for formatting (e.g., **bold**, *italic*, - list item).
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                <div className="space-y-6">
                    <FormField
                        control={form.control}
                        name="tier_access"
                        render={({ field }) => (
                        <FormItem>
                            <div className="mb-4">
                            <FormLabel className="text-base">Tier Access</FormLabel>
                            <FormDescription>
                                Select which agent tiers can access this itinerary.
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
                                Select which user types can access this itinerary.
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
                                    Featured itineraries will appear at the top of the list.
                                </FormDescription>
                            </div>
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="isNetPackage"
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
                                    Mark as Net Package
                                </FormLabel>
                                <FormDescription>
                                    Pending users will not be able to see this package.
                                </FormDescription>
                            </div>
                            </FormItem>
                        )}
                        />
                </div>
            </div>

            <div>
                <FormLabel>Packages</FormLabel>
                <FormDescription className="mb-2">Define the locations and their travel options.</FormDescription>
                <div className="space-y-4 rounded-md border p-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                         <div className="flex justify-between items-center mb-4">
                             <FormField
                                control={form.control}
                                name={`packages.${index}.name`}
                                render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel>Location #{index + 1}</FormLabel>
                                    <FormControl>
                                    <Input placeholder="e.g., Soroi Mara Bush Camp" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="ml-4 mt-8">
                                <Trash2 />
                                <span className="sr-only">Remove package</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <TravelLinkInput pkgIndex={index} fieldName="driveIn" />
                             <TravelLinkInput pkgIndex={index} fieldName="flyIn" />
                             <TravelLinkInput pkgIndex={index} fieldName="railSafari" />
                        </div>
                    </div>
                ))}
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => append({ 
                        name: "", 
                        driveIn: { type: 'url', value: 'N/A' }, 
                        flyIn: { type: 'url', value: 'N/A' }, 
                        railSafari: { type: 'url', value: 'N/A' } 
                    })}
                    >
                    <PlusCircle className="mr-2" />
                    Add Package
                </Button>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Add Itinerary'}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export const ItineraryForm = React.memo(ItineraryFormComponent);
