import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AdminLayout } from "./components/Layout";
import LoginPage from "./pages/login";
import DashboardPage from "./pages/dashboard";
import UsersPage from "./pages/users";
import ServicesPage from "./pages/services";
import OrdersPage from "./pages/orders";
import TransactionsPage from "./pages/transactions";
import PostsPage from "./pages/posts";
import CommentsPage from "./pages/comments";
import ChatPage from "./pages/chat";
import CoachingPage from "./pages/coaching";
import OutletPage from "./pages/outlet";
import AnalyticsPage from "./pages/analytics";
import NotificationsPage from "./pages/notifications";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/users" component={UsersPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/posts" component={PostsPage} />
        <Route path="/comments" component={CommentsPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/coaching" component={CoachingPage} />
        <Route path="/outlet" component={OutletPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
