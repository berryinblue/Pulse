import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { format } from "date-fns";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    tagsJson: string[] | null;
    locationText: string | null;
    isVirtual: boolean;
    startAt: string;
    endAt: string;
    capacity: number | null;
    creatorUserId: string;
    creator: {
      displayName: string;
      avatarUrl: string | null;
    };
    attendeeCount: number;
    userRsvpStatus: string | null;
  };
  featured?: boolean;
}

export default function EventCard({ event: initialEvent, featured = false }: EventCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user to check if they created this event
  const { data: currentUser } = useQuery({
    queryKey: ['/api/me'],
  });

  // Get the most up-to-date event data directly from the individual event endpoint
  const { data: freshEvent } = useQuery({
    queryKey: ["/api/events", initialEvent.id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${initialEvent.id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch event");
      return response.json();
    },
  });
  
  // Use fresh data if available, fallback to initial event
  const event = freshEvent || initialEvent;
  
  // Calculate attendeeCount from attendees array if using fresh data
  if (freshEvent && freshEvent.attendees) {
    event.attendeeCount = freshEvent.attendees.length;
  }

  const rsvpMutation = useMutation({
    mutationFn: async (status: "yes" | "no") => {
      const response = await apiRequest("POST", `/api/events/${event.id}/rsvp`, { status });
      return response.json();
    },
    onMutate: async (status) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/events"] });
      
      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(["/api/events"]);
      
      // Optimistically update the event list
      queryClient.setQueryData(["/api/events"], (old: any) => {
        if (!old) return old;
        return old.map((e: any) => 
          e.id === event.id 
            ? { ...e, userRsvpStatus: status }
            : e
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (err, status, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousEvents) {
        queryClient.setQueryData(["/api/events"], context.previousEvents);
      }
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "RSVP Updated",
        description: data.message,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const handleRsvp = () => {
    if (event.userRsvpStatus === "yes" || event.userRsvpStatus === "waitlist") {
      rsvpMutation.mutate("no");
    } else {
      rsvpMutation.mutate("yes");
    }
  };

  const isEventCreator = currentUser && event.creatorUserId === currentUser.id;
  
  const getRsvpButtonText = () => {
    if (rsvpMutation.isPending) return "Updating...";
    
    if (isEventCreator) {
      return "Cancel Event";
    }
    
    switch (event.userRsvpStatus) {
      case "yes":
        return "Cancel RSVP";
      case "waitlist":
        return "Leave Waitlist";
      default:
        return event.capacity && event.attendeeCount >= event.capacity ? "Join Waitlist" : "Join";
    }
  };

  const getRsvpButtonVariant = () => {
    return event.userRsvpStatus === "yes" || event.userRsvpStatus === "waitlist" 
      ? "outline" 
      : "default";
  };

  const startDate = new Date(event.startAt);
  const endDate = new Date(event.endAt);
  const tags = event.tagsJson || [];

  const isAtCapacity = event.capacity && event.attendeeCount >= event.capacity;
  const spotsLeft = event.capacity ? event.capacity - event.attendeeCount : null;

  if (featured) {
    return (
      <Link href={`/events/${event.id}`} className="block">
        <Card className={`${featured ? 'md:col-span-2 xl:col-span-3' : ''} overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
          {/* Featured events would have an image, but we don't generate binary files */}
        <div className="h-48 bg-gradient-to-r from-primary/20 to-accent/20"></div>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="default">Featured</Badge>
                {isEventCreator && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Hosting</Badge>}
                {!isEventCreator && event.userRsvpStatus === "yes" && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Going</Badge>}
                {!isEventCreator && event.userRsvpStatus === "waitlist" && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Waitlisted</Badge>}
                {!isEventCreator && (event.userRsvpStatus === "no" || event.userRsvpStatus === "cancelled") && <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Not Going</Badge>}
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
              <h3 className="text-xl font-semibold mb-2 hover:text-primary cursor-pointer" data-testid={`text-event-title-${event.id}`}>
                {event.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4" data-testid={`text-event-description-${event.id}`}>
                {event.description}
              </p>
            </div>
            <Button variant="ghost" size="icon" data-testid={`button-bookmark-${event.id}`}>
              <i className="far fa-bookmark text-muted-foreground"></i>
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center">
              <i className="fas fa-calendar-alt mr-2"></i>
              <span data-testid={`text-event-date-${event.id}`}>
                {format(startDate, 'EEE, MMM d')}
              </span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-clock mr-2"></i>
              <span data-testid={`text-event-time-${event.id}`}>
                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
              </span>
            </div>
            <div className="flex items-center">
              <i className={`${event.isVirtual ? 'fas fa-video' : 'fas fa-map-marker-alt'} mr-2`}></i>
              <span data-testid={`text-event-location-${event.id}`}>
                {event.locationText || (event.isVirtual ? 'Virtual' : 'Location TBD')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="flex -space-x-2 mr-2">
                  <Avatar className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={event.creator.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {event.creator.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {event.attendeeCount > 1 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                      +{event.attendeeCount - 1}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground" data-testid={`text-attendee-count-${event.id}`}>
                  {event.attendeeCount} going
                </span>
              </div>
              {spotsLeft !== null && (
                <span className="text-sm text-muted-foreground" data-testid={`text-spots-left-${event.id}`}>
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                </span>
              )}
            </div>
            
          </div>
        </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      {/* Regular events would have images, but we don't generate binary files */}
      <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20"></div>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-2">
          {isEventCreator && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">Hosting</Badge>}
          {!isEventCreator && event.userRsvpStatus === "yes" && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Going</Badge>}
          {!isEventCreator && event.userRsvpStatus === "waitlist" && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Waitlisted</Badge>}
          {!isEventCreator && (event.userRsvpStatus === "no" || event.userRsvpStatus === "cancelled") && <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">Not Going</Badge>}
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <h4 className="font-medium mb-2 hover:text-primary" data-testid={`text-event-title-${event.id}`}>
          {event.title}
        </h4>
        
        <div className="space-y-1 text-xs text-muted-foreground mb-3">
          <div className="flex items-center">
            <i className="fas fa-calendar-alt mr-2 w-3"></i>
            <span data-testid={`text-event-date-${event.id}`}>
              {format(startDate, 'EEE, MMM d')}
            </span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-clock mr-2 w-3"></i>
            <span data-testid={`text-event-time-${event.id}`}>
              {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center">
            <i className={`${event.isVirtual ? 'fas fa-video' : 'fas fa-map-marker-alt'} mr-2 w-3`}></i>
            <span data-testid={`text-event-location-${event.id}`}>
              {event.locationText || (event.isVirtual ? 'Virtual' : 'Location TBD')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {event.attendeeCount > 0 ? (
              <>
                <div className="flex -space-x-1">
                  <Avatar className="w-5 h-5 border border-background">
                    <AvatarImage src={event.creator.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {event.creator.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {event.attendeeCount > 1 && (
                    <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-xs">
                      +{event.attendeeCount - 1}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground" data-testid={`text-attendee-count-${event.id}`}>
                  {event.attendeeCount} going
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {isAtCapacity ? 'Full' : 'Be the first to join'}
              </span>
            )}
          </div>
          
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
