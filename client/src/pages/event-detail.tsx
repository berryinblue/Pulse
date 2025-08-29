import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { useState } from "react";

export default function EventDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const goBack = () => {
    setLocation("/");
  };

  const { data: event, isLoading } = useQuery({
    queryKey: ["/api/events", id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch event");
      return response.json();
    },
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: "yes" | "no") => {
      const response = await apiRequest("POST", `/api/events/${id}/rsvp`, { status });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/created"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/rsvped"] });
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

  const cancelEventMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/events/${id}`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event Cancelled",
        description: "The event has been cancelled and attendees have been notified.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToCalendar = () => {
    try {
      const startDate = new Date(event.startAt);
      const endDate = new Date(event.endAt);
      
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.locationText || (event.isVirtual ? 'Virtual Event' : ''))}`;
      
      window.open(calendarUrl, '_blank');
      
      toast({
        title: "Calendar Opened",
        description: "Google Calendar opened to add this event.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open calendar.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
            <h1 className="text-2xl font-bold mb-2">Event not found</h1>
            <p className="text-muted-foreground">This event may have been removed or is not accessible.</p>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startAt);
  const endDate = new Date(event.endAt);
  const tags = event.tagsJson || [];
  const attendees = event.attendees || [];

  const handleRsvp = () => {
    if (event.userRsvpStatus === "yes" || event.userRsvpStatus === "waitlist") {
      rsvpMutation.mutate("no");
    } else {
      rsvpMutation.mutate("yes");
    }
  };

  const getRsvpButtonText = () => {
    if (rsvpMutation.isPending) return "Updating...";
    
    switch (event.userRsvpStatus) {
      case "yes":
        return "Cancel RSVP";
      case "waitlist":
        return "Leave Waitlist";
      default:
        return "RSVP";
    }
  };

  const getRsvpButtonVariant = () => {
    return event.userRsvpStatus === "yes" || event.userRsvpStatus === "waitlist" 
      ? "outline" 
      : "default";
  };

  const isEventCreator = currentUser && event && currentUser.id === event.creatorUserId;

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
            <span>Back to Events</span>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-4">
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                  {isEventCreator && (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      Hosting
                    </Badge>
                  )}
                  {!isEventCreator && event.userRsvpStatus === "yes" && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Going
                    </Badge>
                  )}
                  {!isEventCreator && event.userRsvpStatus === "waitlist" && (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      Waitlisted
                    </Badge>
                  )}
                  {!isEventCreator && (event.userRsvpStatus === "no" || event.userRsvpStatus === "cancelled") && (
                    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                      Not Going
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl mb-4" data-testid="text-event-title">
                  {event.title}
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon" data-testid="button-bookmark">
                <i className="far fa-bookmark text-muted-foreground"></i>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {event.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">About this event</h3>
                <p className="text-muted-foreground" data-testid="text-event-description">
                  {event.description}
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Event Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <i className="fas fa-calendar-alt mr-3 w-5 text-muted-foreground"></i>
                    <div>
                      <div className="font-medium" data-testid="text-event-date">
                        {startDate.toDateString() === endDate.toDateString() ? (
                          format(startDate, 'EEEE, MMMM d, yyyy')
                        ) : (
                          `${format(startDate, 'EEEE, MMMM d, yyyy')} - ${format(endDate, 'EEEE, MMMM d, yyyy')}`
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid="text-event-time">
                        {startDate.toDateString() === endDate.toDateString() ? (
                          `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
                        ) : (
                          `${format(startDate, 'MMMM d, h:mm a')} - ${format(endDate, 'MMMM d, h:mm a')}`
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <i className={`${event.isVirtual ? 'fas fa-video' : 'fas fa-map-marker-alt'} mr-3 w-5 text-muted-foreground`}></i>
                    <div data-testid="text-event-location">
                      {event.locationText || (event.isVirtual ? 'Virtual Event' : 'Location TBD')}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3">
                      <AvatarImage src={event.creator.avatarUrl || undefined} />
                      <AvatarFallback>
                        {event.creator.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Hosted by</div>
                      <div className="text-sm text-muted-foreground" data-testid="text-event-creator">
                        {event.creator.displayName}
                      </div>
                    </div>
                  </div>

                  {event.capacity && (
                    <div className="flex items-center">
                      <i className="fas fa-users mr-3 w-5 text-muted-foreground"></i>
                      <div>
                        <div className="font-medium">Capacity</div>
                        <div className="text-sm text-muted-foreground" data-testid="text-event-capacity">
                          {attendees.length} / {event.capacity} people
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {attendees.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Who's going ({attendees.length})
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {attendees.slice(0, 10).map((attendee: any) => (
                      <div key={attendee.id} className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={attendee.avatarUrl || undefined} />
                          <AvatarFallback>
                            {attendee.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium" data-testid={`text-attendee-name-${attendee.id}`}>
                            {attendee.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{attendee.domain}
                          </div>
                        </div>
                      </div>
                    ))}
                    {attendees.length > 10 && (
                      <div className="text-sm text-muted-foreground">
                        +{attendees.length - 10} more attendees
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={addToCalendar}
                  data-testid="button-add-calendar"
                >
                  <i className="fas fa-calendar-plus mr-2"></i>
                  Add to Calendar
                </Button>
                {!isEventCreator && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid="button-report"
                  >
                    <i className="fas fa-flag mr-2"></i>
                    Report Event
                  </Button>
                )}
              </div>
              {isEventCreator ? (
                <div className="flex space-x-3">
                  <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="lg"
                        data-testid="button-cancel-event"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Cancel Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Event</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to cancel this event? All attendees will be notified by email and this action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelDialog(false)}
                        >
                          Keep Event
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            cancelEventMutation.mutate();
                            setShowCancelDialog(false);
                          }}
                          disabled={cancelEventMutation.isPending}
                        >
                          {cancelEventMutation.isPending ? "Canceling..." : "Yes, Cancel Event"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setLocation(`/events/${id}/edit`)}
                    data-testid="button-modify-event"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Modify Event
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleRsvp}
                  disabled={rsvpMutation.isPending}
                  variant={getRsvpButtonVariant() as any}
                  size="lg"
                  data-testid="button-register"
                >
                  <i className="fas fa-check mr-2"></i>
                  {event.userRsvpStatus === "yes" || event.userRsvpStatus === "waitlist" ? "Cancel" : "Join"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
