import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/">
              <Button className="w-full">Go to Home</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Sign in with Different Account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnauthorizedPage;
