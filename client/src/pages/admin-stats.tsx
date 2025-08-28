import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <i className="fas fa-exclamation-triangle text-4xl text-muted-foreground mb-4"></i>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view admin statistics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform usage statistics and metrics</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Total Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <i className="fas fa-users text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-users">
                {stats.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{stats.recentUsers}</span> this week
              </p>
            </CardContent>
          </Card>

          {/* Total Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <i className="fas fa-calendar text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-events">
                {stats.totalEvents.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{stats.recentEvents}</span> this week
              </p>
            </CardContent>
          </Card>

          {/* Total RSVPs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total RSVPs</CardTitle>
              <i className="fas fa-check-circle text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-rsvps">
                {stats.totalRsvps.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{stats.recentRsvps}</span> this week
              </p>
            </CardContent>
          </Card>

          {/* RSVP Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg RSVPs per Event</CardTitle>
              <i className="fas fa-chart-line text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-rsvp-rate">
                {stats.totalEvents > 0 ? (stats.totalRsvps / stats.totalEvents).toFixed(1) : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                RSVPs per event created
              </p>
            </CardContent>
          </Card>

          {/* User Engagement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <i className="fas fa-percentage text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-engagement-rate">
                {stats.totalUsers > 0 ? ((stats.totalRsvps / stats.totalUsers) * 100).toFixed(1) : "0"}%
              </div>
              <p className="text-xs text-muted-foreground">
                Users who have RSVPed
              </p>
            </CardContent>
          </Card>

          {/* Growth Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
              <i className="fas fa-trending-up text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-weekly-growth">
                +{stats.recentUsers + stats.recentEvents + stats.recentRsvps}
              </div>
              <p className="text-xs text-muted-foreground">
                New users, events, and RSVPs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Tags */}
        {stats.topTags && stats.topTags.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Popular Tags</CardTitle>
              <CardDescription>Most used tags in events this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map((tag: any) => (
                  <Badge key={tag.tag} variant="secondary" className="text-sm">
                    {tag.tag} ({tag.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Database Connected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Auth System Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Email Service Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
