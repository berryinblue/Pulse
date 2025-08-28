import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { redirectToGoogleAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function GoogleAuth() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'auth' || errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    } else if (errorParam === 'access_denied' || errorParam === 'domain_restricted') {
      setError('Access denied. Only @google.com email addresses are allowed to access Pulse. Please use your Google corporate email address.');
    }
    
    // Clear error from URL
    if (errorParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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
          {error && (
            <Alert variant="destructive" className="mb-4" data-testid="alert-auth-error">
              <i className="fas fa-exclamation-triangle h-4 w-4"></i>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
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
