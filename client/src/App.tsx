import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/user-management";
import DataSystems from "@/pages/data-systems";
import DataSources from "@/pages/data-sources";
import DataSourceDetails from "@/pages/data-source-details";
import CrossReferences from "@/pages/cross-references";
import CrossReferenceDetails from "@/pages/cross-reference-details";
import DataExtraction from "@/pages/data-extraction";
import NotFound from "@/pages/not-found";
import DataMapping from "@/pages/data-mapping";
import { lazy } from "react";

function AuthenticatedRoute({ component: Component, ...props }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <MainLayout>
      <Component {...props} />
    </MainLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        {(params) => <AuthenticatedRoute component={Dashboard} {...params} />}
      </Route>
      <Route path="/users">
        {(params) => <AuthenticatedRoute component={UserManagement} {...params} />}
      </Route>
      <Route path="/data-systems">
        {(params) => <AuthenticatedRoute component={DataSystems} {...params} />}
      </Route>
      <Route path="/data-sources">
        {(params) => <AuthenticatedRoute component={DataSources} {...params} />}
      </Route>
      <Route path="/data-sources/:id">
        {(params) => <AuthenticatedRoute component={DataSourceDetails} {...params} />}
      </Route>
      <Route path="/cross-references">
        {(params) => <AuthenticatedRoute component={CrossReferences} {...params} />}
      </Route>
      <Route path="/cross-references/:id">
        {(params) => <AuthenticatedRoute component={CrossReferenceDetails} {...params} />}
      </Route>
      <Route path="/data-extraction">
        {(params) => <AuthenticatedRoute component={DataExtraction} {...params} />}
      </Route>
      <Route path="/data-mapping">
        {(params) => <AuthenticatedRoute component={DataMapping} {...params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;