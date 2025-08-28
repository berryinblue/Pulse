import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, logout } from "@/lib/auth";

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const navigationItems = [
    { href: "/", label: "Events", icon: "fas fa-calendar-days" },
    { href: "/create", label: "Create Event", icon: "fas fa-plus" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-primary">
                  <i className="fas fa-pulse mr-2"></i>Pulse
                </h1>
              </Link>
            </div>
            <nav className="hidden md:block">
              <div className="flex items-center space-x-6">
                {navigationItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`${
                        location === item.href
                          ? "text-primary font-medium border-b-2 border-primary pb-4 -mb-4"
                          : "text-muted-foreground hover:text-foreground"
                      } transition-colors`}
                      data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                    >
                      <i className={`${item.icon} mr-2`}></i>
                      {item.label}
                    </a>
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              data-testid="button-notifications"
            >
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute top-0 right-0 h-2 w-2 bg-accent rounded-full"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-3 cursor-pointer">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                  <AvatarFallback>
                    {user.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium" data-testid="text-user-name">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-domain">
                    @{user.domain}
                  </p>
                </div>
                <i className="fas fa-chevron-down text-xs text-muted-foreground"></i>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" data-testid="link-profile">
                    <i className="fas fa-user mr-2"></i>
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-events" data-testid="link-my-events">
                    <i className="fas fa-calendar mr-2"></i>
                    My Events
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={logout}
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
