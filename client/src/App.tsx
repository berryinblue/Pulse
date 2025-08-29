import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./lib/auth";
import GoogleAuth from "./components/auth/google-auth";
import Home from "./pages/home";
import CreateEvent from "./pages/create-event";
import EditEvent from "./pages/edit-event";
import EventDetail from "./pages/event-detail";
import AdminStats from "./pages/admin-stats";
import Profile from "./pages/profile";
import MyEvents from "./pages/my-events";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GoogleAuth />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateEvent} />
      <Route path="/events/:id/edit" component={EditEvent} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/admin/stats" component={AdminStats} />
      <Route path="/profile" component={Profile} />
      <Route path="/my-events" component={MyEvents} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
