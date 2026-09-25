import { MemberProvider } from '@/integrations';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ScrollToTop } from '@/lib/scroll-to-top';
import { MemberProtectedRoute } from '@/components/ui/member-protected-route';
import ErrorPage from '@/integrations/errorHandlers/ErrorPage';

// Pages
import HomePage from '@/components/pages/HomePage';
import LoginPage from '@/components/pages/LoginPage';
import ProfilePage from '@/components/pages/ProfilePage';
import OnboardingPage from '@/components/pages/OnboardingPage';
import TodayPage from '@/components/pages/TodayPage';
import InboxPage from '@/components/pages/InboxPage';
import LeadsPage from '@/components/pages/LeadsPage';
import LeadDetailPage from '@/components/pages/LeadDetailPage';
import CustomersPage from '@/components/pages/CustomersPage';
import CustomerDetailPage from '@/components/pages/CustomerDetailPage';
import FollowUpsPage from '@/components/pages/FollowUpsPage';
import SupportPage from '@/components/pages/SupportPage';
import InsightsPage from '@/components/pages/InsightsPage';
import BusinessBrainPage from '@/components/pages/BusinessBrainPage';
import TeamPage from '@/components/pages/TeamPage';
import ChannelsPage from '@/components/pages/ChannelsPage';
import BillingPage from '@/components/pages/BillingPage';
import SettingsPage from '@/components/pages/SettingsPage';

// Layout component that includes ScrollToTop
function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
        routeMetadata: {
          pageIdentifier: 'home',
        },
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "profile",
        element: (
          <MemberProtectedRoute>
            <ProfilePage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "onboarding",
        element: (
          <MemberProtectedRoute>
            <OnboardingPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "today",
        element: (
          <MemberProtectedRoute>
            <TodayPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "inbox",
        element: (
          <MemberProtectedRoute>
            <InboxPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "leads",
        element: (
          <MemberProtectedRoute>
            <LeadsPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "leads/:id",
        element: (
          <MemberProtectedRoute>
            <LeadDetailPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "customers",
        element: (
          <MemberProtectedRoute>
            <CustomersPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "customers/:id",
        element: (
          <MemberProtectedRoute>
            <CustomerDetailPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "follow-ups",
        element: (
          <MemberProtectedRoute>
            <FollowUpsPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "support",
        element: (
          <MemberProtectedRoute>
            <SupportPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "insights",
        element: (
          <MemberProtectedRoute>
            <InsightsPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "business-brain",
        element: (
          <MemberProtectedRoute>
            <BusinessBrainPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "team",
        element: (
          <MemberProtectedRoute>
            <TeamPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "channels",
        element: (
          <MemberProtectedRoute>
            <ChannelsPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "billing",
        element: (
          <MemberProtectedRoute>
            <BillingPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <MemberProtectedRoute>
            <SettingsPage />
          </MemberProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
], {
  basename: import.meta.env.BASE_NAME,
});

export default function AppRouter() {
  return (
    <MemberProvider>
      <RouterProvider router={router} />
    </MemberProvider>
  );
}
