import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  locationText: string;
  isVirtual: boolean;
  capacity: number | null;
  statusEnum: string;
  tagsJson: string[];
  creator: {
    displayName: string;
    avatarUrl: string | null;
  };
  rsvpCount: number;
  userRsvpStatus: string | null;
}

interface EventCardProps {
  event: Event;
  showStatus?: boolean;
  showRsvpStatus?: boolean;
}

function EventCard({ event, showStatus = false, showRsvpStatus = false }: EventCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "hidden": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getRsvpStatusColor = (status: string) => {
    switch (status) {
      case "yes": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "waitlist": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <Link href={`/events/${event.id}`}>
              <h3 className="text-lg font-semibold hover:text-primary cursor-pointer mb-2" data-testid={`text-event-title-${event.id}`}>
                {event.title}
              </h3>
            </Link>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {event.description}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {showStatus && (
              <Badge className={getStatusColor(event.statusEnum)} data-testid={`badge-status-${event.id}`}>
                {event.statusEnum === "active" ? "Hosting" : event.statusEnum}
              </Badge>
            )}
            {showRsvpStatus && event.userRsvpStatus && (
              <Badge className={getRsvpStatusColor(event.userRsvpStatus)} data-testid={`badge-rsvp-${event.id}`}>
                {event.userRsvpStatus === "yes" ? "Going" : event.userRsvpStatus}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <i className="fas fa-calendar mr-2 w-4"></i>
            <span data-testid={`text-event-date-${event.id}`}>
              {format(new Date(event.startAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <i className={`${event.isVirtual ? "fas fa-video" : "fas fa-map-marker-alt"} mr-2 w-4`}></i>
            <span data-testid={`text-event-location-${event.id}`}>
              {event.isVirtual ? "Virtual Event" : (event.locationText || "Location TBD")}
            </span>
          </div>

          {event.capacity && (
            <div className="flex items-center text-sm text-muted-foreground">
              <i className="fas fa-users mr-2 w-4"></i>
              <span data-testid={`text-event-capacity-${event.id}`}>
                {event.rsvpCount} / {event.capacity} attendees
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={event.creator.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(event.creator.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground" data-testid={`text-event-creator-${event.id}`}>
              by {event.creator.displayName}
            </span>
          </div>

          {event.tagsJson && event.tagsJson.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tagsJson.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs" data-testid={`tag-${tag.toLowerCase()}-${event.id}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyEvents() {
  const { data: createdEvents = [], isLoading: createdLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/created"],
  });

  const { data: rsvpedEvents = [], isLoading: rsvpedLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/rsvped"],
  });

  const isLoading = createdLoading || rsvpedLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Events</h1>
            <p className="text-muted-foreground">
              Manage your created events and view events you're attending
            </p>
          </div>
          <Button asChild data-testid="button-create-event">
            <Link href="/create">
              <i className="fas fa-plus mr-2"></i>
              Create Event
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="created" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="created" data-testid="tab-created">
              Created Events ({createdEvents.length})
            </TabsTrigger>
            <TabsTrigger value="attending" data-testid="tab-attending">
              Attending ({rsvpedEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="mt-6">
            {createdEvents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <i className="fas fa-calendar-plus text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold mb-2">No events created yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first event to bring your team together!
                  </p>
                  <Button asChild data-testid="button-create-first-event">
                    <Link href="/create">
                      <i className="fas fa-plus mr-2"></i>
                      Create Your First Event
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {createdEvents.map((event: Event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    showStatus={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attending" className="mt-6">
            {rsvpedEvents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <i className="fas fa-calendar-check text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold mb-2">No events attending</h3>
                  <p className="text-muted-foreground mb-6">
                    Discover and RSVP to events happening at your company!
                  </p>
                  <Button asChild data-testid="button-browse-events">
                    <Link href="/">
                      <i className="fas fa-search mr-2"></i>
                      Browse Events
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rsvpedEvents.map((event: Event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    showRsvpStatus={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}