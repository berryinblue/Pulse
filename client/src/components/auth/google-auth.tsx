import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectToGoogleAuth } from "@/lib/auth";

export default function GoogleAuth() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-pulse text-white text-xl"></i>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Pulse</CardTitle>
          <CardDescription>
            A verified, employee-only hub for discovering and hosting internal company events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={redirectToGoogleAuth}
            className="w-full"
            data-testid="button-google-signin"
          >
            <i className="fab fa-google mr-2"></i>
            Sign in with Google
          </Button>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Currently supporting @google.com employees
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
