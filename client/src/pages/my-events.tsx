import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCard from "@/components/event-card";

export default function MyEvents() {
  const { data: createdEvents = [], isLoading: createdLoading } = useQuery({
    queryKey: ["/api/events/created"],
  });

  const { data: rsvpedEvents = [], isLoading: rsvpedLoading } = useQuery({
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
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {createdEvents.map((event: any) => (
                  <EventCard key={event.id} event={event} />
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
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {rsvpedEvents.map((event: any) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}