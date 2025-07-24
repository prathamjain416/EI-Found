import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-primary">404</h1>
              <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
              <p className="text-muted-foreground">
                Sorry, the page you are looking for doesn't exist or has been moved.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="default">
                <Link to="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
              <Button asChild variant="outline" onClick={() => window.history.back()}>
                <button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </button>
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Attempted to access: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
