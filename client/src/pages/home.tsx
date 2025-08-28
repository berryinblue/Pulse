import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import FiltersSidebar from "@/components/filters-sidebar";
import EventCard from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState("date");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
      const response = await fetch(`/api/events?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const sortedEvents = [...events].sort((a, b) => {
    switch (sortBy) {
      case "popularity":
        return b.attendeeCount - a.attendeeCount;
      case "relevance":
        return 0; // Would implement relevance scoring
      case "date":
      default:
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    }
  });

  // Featured event is the first event with highest attendance
  const featuredEvent = sortedEvents.length > 0 
    ? sortedEvents.reduce((max, event) => event.attendeeCount > max.attendeeCount ? event : max)
    : null;
  
  const regularEvents = sortedEvents.filter(event => event.id !== featuredEvent?.id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <FiltersSidebar onFiltersChange={setFilters} isLoading={isLoading} />
          
          <main className="flex-1">
            {/* Header with count and sort */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Upcoming Events</h2>
                <p className="text-muted-foreground">
                  <span data-testid="text-event-count">{events.length}</span> events this week at your company
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="popularity">Sort by Popularity</SelectItem>
                    <SelectItem value="relevance">Sort by Relevance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <i className="fas fa-calendar-plus text-4xl text-muted-foreground"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No events found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or be the first to create an event!
                </p>
                <Button>
                  <i className="fas fa-plus mr-2"></i>Create Event
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {featuredEvent && (
                    <EventCard event={featuredEvent} featured={true} />
                  )}
                  
                  {regularEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>

                {events.length >= 12 && (
                  <div className="mt-8 text-center">
                    <Button variant="secondary" data-testid="button-load-more">
                      Load More Events
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
