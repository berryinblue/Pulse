import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useRoute } from "wouter";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const availableTags = ["Social", "Career", "Fitness", "Learning", "Food"];

const editEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long"),
  startAt: z.string().min(1, "Start date is required"),
  endAt: z.string().min(1, "End date is required"),
  locationText: z.string().optional(),
  campus: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be greater than 0").optional(),
  isVirtual: z.boolean(),
  tags: z.array(z.string()),
  visibilityEnum: z.enum(["company_only", "cross_company"]),
  allowedDomains: z.array(z.string()),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  {
    message: "End time must be after start time",
    path: ["endAt"],
  }
);

type EditEventForm = z.infer<typeof editEventSchema>;

export default function EditEvent() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/events/:id/edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);

  const eventId = params?.id;

  const { data: event, isLoading } = useQuery({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const goBack = () => {
    window.history.back();
  };

  const form = useForm<EditEventForm>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startAt: "",
      endAt: "",
      locationText: "",
      campus: "",
      capacity: undefined,
      isVirtual: false,
      tags: [],
      visibilityEnum: "company_only",
      allowedDomains: [],
    },
  });

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      const startAtISO = new Date(event.startAt).toISOString().slice(0, 16);
      const endAtISO = new Date(event.endAt).toISOString().slice(0, 16);
      
      form.setValue("title", event.title);
      form.setValue("description", event.description || "");
      form.setValue("startAt", startAtISO);
      form.setValue("endAt", endAtISO);
      form.setValue("locationText", event.locationText || "");
      form.setValue("campus", event.campus || "");
      form.setValue("capacity", event.capacity || undefined);
      form.setValue("isVirtual", event.isVirtual);
      form.setValue("visibilityEnum", event.visibilityEnum);
      form.setValue("allowedDomains", event.allowedDomainsJson || []);
      
      const tags = event.tagsJson || [];
      setSelectedTags(tags);
      form.setValue("tags", tags);
    }
  }, [event, form]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EditEventForm) => {
      const eventData = {
        ...data,
        tags: selectedTags,
        capacity: data.capacity || undefined,
      };
      const response = await apiRequest("PATCH", `/api/events/${eventId}`, eventData);
      return response.json();
    },
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/created"] });
      toast({
        title: "Event Updated",
        description: "Your event has been updated successfully and attendees have been notified!",
      });
      setLocation(`/events/${updatedEvent.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditEventForm) => {
    updateEventMutation.mutate(data);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const trimmedTag = customTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag) && !availableTags.includes(trimmedTag)) {
      setSelectedTags(prev => [...prev, trimmedTag]);
      setCustomTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Event not found</h1>
            <p className="text-muted-foreground">This event may have been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={goBack}
            className="flex items-center space-x-2"
            data-testid="button-go-back"
          >
            <i className="fas fa-arrow-left"></i>
            <span>Back</span>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Edit Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., ☕ Morning Coffee Chat"
                          {...field}
                          data-testid="input-title"
                        />
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
                        <Textarea
                          placeholder="Tell people what this event is about..."
                          rows={3}
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            data-testid="input-start-time"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            data-testid="input-end-time"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Cafe 150 or Google Meet Link"
                            {...field}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="campus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campus</FormLabel>
                        <FormControl>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-campus">
                              <SelectValue placeholder="Select campus" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mountain View">Mountain View</SelectItem>
                              <SelectItem value="San Francisco">San Francisco</SelectItem>
                              <SelectItem value="New York">New York</SelectItem>
                              <SelectItem value="Austin">Austin</SelectItem>
                              <SelectItem value="Seattle">Seattle</SelectItem>
                              <SelectItem value="London">London</SelectItem>
                              <SelectItem value="Dublin">Dublin</SelectItem>
                              <SelectItem value="Zurich">Zurich</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 20"
                            min="1"
                            {...field}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(value ? Math.max(1, Number(value)) : undefined);
                            }}
                            data-testid="input-capacity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isVirtual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select value={field.value ? "virtual" : "in-person"} onValueChange={(value) => field.onChange(value === "virtual")}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in-person">In-Person</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="mt-2 space-y-3">
                    {/* Available Tags */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Popular tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "secondary"}
                            className="cursor-pointer hover:bg-primary/90"
                            onClick={() => toggleTag(tag)}
                            data-testid={`tag-${tag.toLowerCase()}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Custom Tag Input */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Add custom tag:</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter custom tag..."
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomTag();
                            }
                          }}
                          maxLength={20}
                          data-testid="input-custom-tag"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCustomTag}
                          disabled={!customTag.trim()}
                          data-testid="button-add-tag"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    
                    {/* Selected Tags */}
                    {selectedTags.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Selected tags:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="default"
                              className="cursor-pointer hover:bg-destructive"
                              onClick={() => removeTag(tag)}
                              data-testid={`selected-tag-${tag.toLowerCase()}`}
                            >
                              {tag}
                              <i className="fas fa-times ml-1 text-xs"></i>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="companyOnly" 
                      checked={form.watch("visibilityEnum") === "company_only"}
                      onCheckedChange={(checked) => 
                        form.setValue("visibilityEnum", checked ? "company_only" : "cross_company")
                      }
                      data-testid="checkbox-company-only"
                    />
                    <Label htmlFor="companyOnly" className="text-sm">
                      Company only (Your domain employees)
                    </Label>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation(`/events/${eventId}`)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateEventMutation.isPending}
                      data-testid="button-update"
                    >
                      {updateEventMutation.isPending ? "Updating..." : "Update Event"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}