import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/me"],
  });

  const { data: userEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/users/events"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; avatarUrl?: string }) => {
      const response = await apiRequest("PATCH", "/api/me", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully!",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      setDisplayName(user?.displayName || "");
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      setIsEditing(true);
      // Default to first name only for new users
      const currentName = user?.displayName || "";
      if (!currentName || currentName === user?.email?.split('@')[0]) {
        // If display name is empty or just email username, set to first name from email
        const emailName = user?.email?.split('@')[0] || "";
        const firstName = emailName.split('.')[0] || emailName;
        setDisplayName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
      } else {
        setDisplayName(currentName);
      }
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      let avatarUrl = user?.avatarUrl;
      
      // If a new file is selected, upload it
      if (selectedFile && previewUrl) {
        const uploadResponse = await apiRequest("POST", "/api/upload/avatar", {
          imageData: previewUrl
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || "Failed to upload image");
        }
        
        const uploadResult = await uploadResponse.json();
        avatarUrl = uploadResult.url;
      }
      
      // Update profile with new data
      const updateData: { displayName?: string; avatarUrl?: string } = {};
      if (displayName !== user?.displayName) {
        updateData.displayName = displayName;
      }
      if (avatarUrl && avatarUrl !== user?.avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }
      
      if (Object.keys(updateData).length > 0) {
        updateProfileMutation.mutate(updateData);
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const createdEvents = userEvents.filter((e: any) => e.type === "created") || [];
  const rsvpedEvents = userEvents.filter((e: any) => e.type === "rsvped") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage 
                      src={previewUrl || user?.avatarUrl || undefined} 
                      alt={user?.displayName} 
                    />
                    <AvatarFallback className="text-lg">
                      {user?.displayName ? getInitials(user.displayName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <Label htmlFor="avatar-upload" className="cursor-pointer text-white text-xs text-center">
                        <i className="fas fa-camera block mb-1"></i>
                        Change
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-avatar"
                      />
                    </div>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        data-testid="input-display-name"
                      />
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-2xl font-bold" data-testid="text-display-name">
                        {user?.displayName}
                      </h1>
                      <p className="text-muted-foreground" data-testid="text-email">
                        {user?.email}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {user?.domain}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleEditToggle}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    data-testid="button-edit"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Account Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Email Address</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-profile-email">
                  {user?.email}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Company Domain</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-profile-domain">
                  {user?.domain}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Member Since</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-member-since">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Account Status</Label>
                <div className="mt-1">
                  <Badge variant={user?.verifiedAt ? "default" : "secondary"} data-testid="badge-status">
                    {user?.verifiedAt ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary" data-testid="text-events-created">
                    {createdEvents.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Events Created</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-events-attended">
                    {rsvpedEvents.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Events Attended</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-total-activity">
                    {createdEvents.length + rsvpedEvents.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Activity</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}