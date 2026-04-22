
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { addProperty, updateProperty, uploadPropertyImageFromFormData } from "@/services/property-service";
import type { Property } from "@/lib/types";
import * as React from 'react';
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long."),
  type: z.enum(['Lodge', 'Camp', 'Hotel', 'Cottage'], { required_error: "Please select a property type." }),
  location: z.string().min(3, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  images: z.any().optional()
    .refine(
        (files) => !files || files.length === 0 || Array.from(files).every((file: any) => file.size <= MAX_FILE_SIZE_BYTES),
        `Each image must be less than ${MAX_FILE_SIZE_MB}MB.`
    ),
  existingImages: z.array(z.string()).optional(),
  wetuIbrochureUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  total_rooms: z.coerce.number().min(1, "Total rooms must be at least 1."),
  room_types: z.array(z.object({
    name: z.string().min(3, "Room type name is required."),
    count: z.coerce.number().min(1, "Count must be at least 1."),
  })).min(1, "At least one room type is required."),
  facilities: z.string().min(3, "Please list at least one facility."),
  amenities: z.string().min(3, "Please list at least one amenity."),
  activities: z.string().min(3, "Please list at least one activity."),
  featured: z.boolean().default(false),
});

interface AddPropertyFormProps {
    property?: Property;
}

const AddPropertyFormComponent = ({ property }: AddPropertyFormProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const { user: viewingUser } = useAuth();
  const isEditMode = !!property;

  const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';

  const defaultFormValues = React.useMemo(() => {
    return isEditMode && property ? {
        ...property,
        wetuIbrochureUrl: property.wetuIbrochureUrl || '',
        facilities: property.facilities.join(', '),
        amenities: property.amenities.join(', '),
        activities: property.activities.join(', '),
        images: undefined,
        existingImages: property.images || [],
    } : {
      name: "",
      type: undefined,
      location: "",
      description: "",
      images: undefined,
      existingImages: [],
      wetuIbrochureUrl: "",
      total_rooms: 1,
      room_types: [{ name: "", count: 1 }],
      facilities: "",
      amenities: "",
      activities: "",
      featured: false,
    }
  }, [property, isEditMode]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "room_types",
  });
  
  const existingImages = useWatch({
    control: form.control,
    name: 'existingImages',
    defaultValue: property?.images || []
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    return await uploadPropertyImageFromFormData(formData);
  };
  
  const removeExistingImage = (index: number) => {
    const updatedImages = existingImages.filter((_, i) => i !== index);
    form.setValue('existingImages', updatedImages);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!canEdit) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to perform this action." });
      return;
    }
    try {
      const imageFiles = values.images instanceof FileList ? Array.from(values.images) : [];
      
      if (!isEditMode && imageFiles.length === 0 && values.existingImages?.length === 0) {
        toast({ variant: "destructive", title: "No Images", description: "You must upload at least one image for a new property." });
        return;
      }
      
      const newImageUrls = await Promise.all(
        imageFiles.map(file => uploadFileAndGetURL(file, `properties/${values.name.toLowerCase().replace(/\s+/g, '-')}/${file.name}`))
      );

      const finalImageUrls = [...(values.existingImages || []), ...newImageUrls];

      // Send only flat data with all arrays pre-stringified
      const flatDeepData = {
        name: values.name,
        type: values.type,
        location: values.location,
        description: values.description,
        wetuIbrochureUrl: values.wetuIbrochureUrl || '',
        total_rooms: values.total_rooms,
        featured: values.featured,
        images_json: JSON.stringify(finalImageUrls),
        room_types_json: JSON.stringify(values.room_types),
        facilities: values.facilities,
        amenities: values.amenities,
        activities: values.activities,
      };

      if (isEditMode && property) {
        await updateProperty(property.id, flatDeepData as any);
        toast({ title: "Property Updated!", description: "The property has been successfully saved." });
      } else {
        await addProperty(flatDeepData as any);
        toast({ title: "Property Added!", description: "The new property has been successfully created." });
      }
      
      router.push('/app/admin/properties');
      router.refresh();

    } catch (error) {
       console.error("Error saving property:", error);
       toast({
        variant: "destructive",
        title: "Error saving property",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  }

  const PageTitle = () => (
    <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{isEditMode ? 'Edit Property' : 'Add New Property'}</h1>
        <p className="text-muted-foreground">
        {isEditMode ? `Modify the details for "${property?.name}".` : 'Fill out the form below to add a new property to your portfolio.'}
        </p>
    </div>
    );

  return (
    <>
        <PageTitle />
        <Card>
        <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>
            {isEditMode ? `Editing details for ${property?.name}` : 'Please provide the details for the new property.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Property Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Serengeti Safari Lodge" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Property Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a property type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Lodge">Lodge</SelectItem>
                                        <SelectItem value="Camp">Camp</SelectItem>
                                        <SelectItem value="Hotel">Hotel</SelectItem>
                                        <SelectItem value="Cottage">Cottage</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Serengeti National Park, Tanzania" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="wetuIbrochureUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Wetu iBrochure URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://wetu.com/iBrochure/en/..." {...field} />
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
                                    <Textarea placeholder="A brief description of the property." {...field} />
                                </FormControl>
                                <FormDescription>
                                    You can use Markdown for formatting (e.g., **bold**, *italic*, - list item).
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        {isEditMode && existingImages.length > 0 && (
                        <div>
                            <FormLabel>Current Images</FormLabel>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                            {existingImages.map((imgUrl, index) => (
                                <div key={index} className="relative group">
                                <Image src={imgUrl} alt={`Existing image ${index+1}`} width={100} height={100} className="rounded-md object-cover w-full aspect-square" referrerPolicy="no-referrer" unoptimized />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeExistingImage(index)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                                </div>
                            ))}
                            </div>
                        </div>
                        )}
                        <FormField
                        control={form.control}
                        name="images"
                        render={({ field: { onChange, onBlur, name, ref } }) => (
                            <FormItem>
                                <FormLabel>{isEditMode ? 'Upload More Images' : 'Property Images'}</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        multiple
                                        onChange={(e) => onChange(e.target.files)}
                                        onBlur={onBlur}
                                        name={name}
                                        ref={ref}
                                    />
                                </FormControl>
                                <FormDescription>{isEditMode ? 'Add new images to the property.' : 'Upload one or more images.'} Each file must be under {MAX_FILE_SIZE_MB}MB.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="total_rooms"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Total Rooms</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div>
                            <FormLabel>Room Types</FormLabel>
                            <FormDescription className="mb-2">Define the different types of rooms available.</FormDescription>
                            <div className="space-y-4 rounded-md border p-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr_80px_auto] gap-4 items-end">
                                    <FormField
                                        control={form.control}
                                        name={`room_types.${index}.name`}
                                        render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel className="text-sm">Room Name</FormLabel>}
                                            <FormControl>
                                            <Input placeholder="e.g., Standard Suite" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`room_types.${index}.count`}
                                        render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel className="text-sm">Count</FormLabel>}
                                            <FormControl>
                                            <Input type="number" placeholder="e.g., 15" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                        <Trash2 />
                                        <span className="sr-only">Remove room type</span>
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => append({ name: "", count: 1 })}
                                >
                                <PlusCircle className="mr-2" />
                                Add Room Type
                            </Button>
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="facilities"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Facilities</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Restaurant, Pool, Spa" {...field} />
                                </FormControl>
                                <FormDescription>Comma-separated list of facilities.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="amenities"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Amenities</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Wi-Fi, Air Conditioning" {...field} />
                                </FormControl>
                                <FormDescription>Comma-separated list of amenities.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="activities"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Activities</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Game Drives, Walking Safaris" {...field} />
                                </FormControl>
                                <FormDescription>Comma-separated list of activities.</FormDescription>
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
                                        Featured properties will be highlighted on the agent dashboard.
                                    </FormDescription>
                                </div>
                                </FormItem>
                            )}
                            />
                    </div>
                </div>


                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting || !canEdit}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Add Property'}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
        </Card>
    </>
  );
}

export const AddPropertyForm = React.memo(AddPropertyFormComponent);
