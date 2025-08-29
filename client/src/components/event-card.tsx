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

export default function EventCard({ event, featured = false }: EventCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user to check if they created this event
  const { data: currentUser } = useQuery({
    queryKey: ['/api/me'],
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: "yes" | "no") => {
      const response = await apiRequest("POST", `/api/events/${event.id}/rsvp`, { status });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "RSVP Updated",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
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
      <Card className={`${featured ? 'md:col-span-2 xl:col-span-3' : ''} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
        {/* Featured events would have an image, but we don't generate binary files */}
        <div className="h-48 bg-gradient-to-r from-primary/20 to-accent/20"></div>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="default">Featured</Badge>
                {isEventCreator && <Badge variant="outline">Host</Badge>}
                {!isEventCreator && event.userRsvpStatus === "yes" && <Badge variant="outline">Going</Badge>}
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
              <Link href={`/events/${event.id}`}>
                <h3 className="text-xl font-semibold mb-2 hover:text-primary cursor-pointer" data-testid={`text-event-title-${event.id}`}>
                  {event.title}
                </h3>
              </Link>
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
            
            {!isEventCreator && (
              event.userRsvpStatus === "yes" ? (
                <Badge variant="default" className="text-sm px-3 py-1">
                  <i className="fas fa-check mr-2"></i>
                  Going
                </Badge>
              ) : (
                <Button
                  onClick={handleRsvp}
                  disabled={rsvpMutation.isPending}
                  variant={getRsvpButtonVariant() as any}
                  data-testid={`button-rsvp-${event.id}`}
                >
                  <i className="fas fa-check mr-2"></i>
                  {getRsvpButtonText()}
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      {/* Regular events would have images, but we don't generate binary files */}
      <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20"></div>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-2">
          {isEventCreator && <Badge variant="outline" className="text-xs">Host</Badge>}
          {!isEventCreator && event.userRsvpStatus === "yes" && <Badge variant="outline" className="text-xs">Going</Badge>}
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <Link href={`/events/${event.id}`}>
          <h4 className="font-medium mb-2 hover:text-primary" data-testid={`text-event-title-${event.id}`}>
            {event.title}
          </h4>
        </Link>
        
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
          
          {!isEventCreator && (
            event.userRsvpStatus === "yes" ? (
              <Badge variant="default" className="text-xs px-2 py-1">
                <i className="fas fa-check mr-1"></i>
                Going
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={handleRsvp}
                disabled={rsvpMutation.isPending}
                variant={getRsvpButtonVariant() as any}
                className="text-sm px-3 py-1"
                data-testid={`button-rsvp-${event.id}`}
              >
                {getRsvpButtonText()}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
