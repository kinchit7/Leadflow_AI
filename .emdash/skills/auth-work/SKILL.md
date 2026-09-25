---
name: auth-work
description: Authentication and member features. Use when implementing login, logout, protected routes, member-only content, or working with user authentication.
---

# Authentication Work

This skill contains all patterns for implementing authentication, protected routes, and member features using Wix Member Features.

---

## Core Principle

**NEVER create custom auth flows or auth-related components manually.**

Always use Wix member features for authentication. The authentication system is fully managed by Wix.

---

## useMembers Hook

```typescript
import { useMembers } from '@wix/member-features';

const MyComponent = () => {
  const { loggedInMember, member } = useMembers();
  
  // loggedInMember - the currently authenticated member object
  // member - alias for loggedInMember
  
  return (
    // ...
  );
};
```

### Member Object Shape

```typescript
interface Member {
  id: string;
  loginEmail: string;
  profile?: {
    nickname?: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
  };
  // Additional member data
}
```

---

## Check Login Status

```typescript
const { member } = useMembers();

// Check if user is logged in
if (member) {
  // User is authenticated
  console.log('Logged in as:', member.loginEmail);
} else {
  // User is not authenticated
}

// Check specific member ID
if (member?.id) {
  // Verified logged in with ID
}
```

---

## Navigation for Auth

```typescript
import { useNavigate } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();

  // Redirect to login page
  const goToLogin = () => {
    navigate('/login');
  };

  // Redirect to home
  const goHome = () => {
    navigate('/');
  };

  // After logout - replace history to prevent back navigation
  const handleLogout = () => {
    // ... logout logic
    navigate('/', { replace: true });
  };

  return (
    // ...
  );
};
```

---

## Protected Route Pattern

Use this pattern to protect pages that require authentication:

```typescript
import { useEffect } from 'react';
import { useMembers } from '@wix/member-features';
import { useNavigate } from 'react-router-dom';

const ProtectedPage = () => {
  const { loggedInMember } = useMembers();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loggedInMember?.id) {
      navigate('/login', { replace: true });
    }
  }, [loggedInMember, navigate]);

  // Don't render content until auth check is complete
  if (!loggedInMember?.id) {
    return null; // or a loading skeleton
  }

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-16">
      <h1 className="font-heading text-4xl mb-8">Protected Content</h1>
      <p className="font-paragraph">
        Welcome, {loggedInMember.profile?.firstName || loggedInMember.loginEmail}!
      </p>
      {/* Protected content here */}
    </div>
  );
};

export default ProtectedPage;
```

### With Loading State

```typescript
import { useState, useEffect } from 'react';
import { useMembers } from '@wix/member-features';
import { useNavigate } from 'react-router-dom';

const ProtectedPage = () => {
  const { loggedInMember } = useMembers();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to allow auth state to settle
    const timer = setTimeout(() => {
      if (!loggedInMember?.id) {
        navigate('/login', { replace: true });
      }
      setIsChecking(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loggedInMember, navigate]);

  if (isChecking) {
    return (
      <div className="max-w-[100rem] mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!loggedInMember?.id) {
    return null;
  }

  return (
    // Protected content
  );
};
```

---

## Login Page

### Rules

- Create only at `/login` route
- Only ONE login page per app
- For additional login-protected pages, redirect to `/login`

### Adding Login Route

In `Router.tsx`:

```typescript
import LoginPage from './pages/LoginPage';

const routes = [
  // ... other routes
  { path: '/login', element: <LoginPage /> },
];
```

### Login Page Pattern

```typescript
import { useEffect } from 'react';
import { useMembers } from '@wix/member-features';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignIn } from '@/components/ui/sign-in';

const LoginPage = () => {
  const { loggedInMember } = useMembers();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    // If already logged in, redirect away from login page
    if (loggedInMember?.id) {
      navigate(from, { replace: true });
    }
  }, [loggedInMember, navigate, from]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl mb-2">Welcome Back</h1>
          <p className="font-paragraph text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        
        <SignIn />
      </div>
    </div>
  );
};

export default LoginPage;
```

---

## Redirect with Return URL

When redirecting to login, preserve the original destination:

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

const ProtectedPage = () => {
  const { loggedInMember } = useMembers();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loggedInMember?.id) {
      // Save current location to return after login
      navigate('/login', { 
        replace: true,
        state: { from: location }
      });
    }
  }, [loggedInMember, navigate, location]);

  // ...
};
```

---

## Conditional UI Based on Auth

### Show Different Content

```typescript
const Header = () => {
  const { member } = useMembers();
  
  return (
    <header className="...">
      <nav>
        {/* Always visible */}
        <Link to="/">Home</Link>
        
        {/* Only for logged-in users */}
        {member && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">Profile</Link>
          </>
        )}
        
        {/* Only for logged-out users */}
        {!member && (
          <Link to="/login">Sign In</Link>
        )}
      </nav>
    </header>
  );
};
```

### User Menu

```typescript
import { useMembers } from '@wix/member-features';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

const UserMenu = () => {
  const { member } = useMembers();
  const navigate = useNavigate();
  
  if (!member) {
    return (
      <Button variant="outline" onClick={() => navigate('/login')}>
        Sign In
      </Button>
    );
  }
  
  const initials = member.profile?.firstName?.[0] || member.loginEmail[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            {member.profile?.photo ? (
              <AvatarImage src={member.profile.photo} alt={member.loginEmail} />
            ) : (
              <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## Handling New Users

When using data saved on the user, handle cases where the user just registered and doesn't have data saved yet:

```typescript
const ProfilePage = () => {
  const { member } = useMembers();
  
  // Handle new users who haven't completed their profile
  const hasCompletedProfile = member?.profile?.firstName && member?.profile?.lastName;
  
  if (member && !hasCompletedProfile) {
    return (
      <div className="max-w-[100rem] mx-auto px-4 py-16">
        <h1 className="font-heading text-3xl mb-4">Complete Your Profile</h1>
        <p className="font-paragraph mb-8">
          Please complete your profile to continue.
        </p>
        {/* Profile completion form */}
      </div>
    );
  }
  
  return (
    <div className="max-w-[100rem] mx-auto px-4 py-16">
      <h1 className="font-heading text-3xl mb-4">
        Welcome, {member?.profile?.firstName}!
      </h1>
      {/* Full profile content */}
    </div>
  );
};
```

---

## Best Practices Summary

### Do

- ✅ Use `useMembers` hook from `@wix/member-features`
- ✅ Redirect unauthenticated users to `/login`
- ✅ Use `{ replace: true }` when redirecting to prevent back navigation issues
- ✅ Handle the case where user just registered (no saved data yet)
- ✅ Show loading/skeleton while checking auth state
- ✅ Preserve return URL when redirecting to login

### Don't

- ❌ Create custom auth flows
- ❌ Create auth-related components manually
- ❌ Call APIs to create custom authentication
- ❌ Store auth tokens manually
- ❌ Create multiple login pages
- ❌ Assume user data exists for new users

---

## MemberProtectedRoute Component

If you need to protect multiple routes, you can use the pre-built component:

```typescript
import { MemberProtectedRoute } from '@/components/ui/member-protected-route';

// In Router.tsx
{
  path: '/dashboard',
  element: (
    <MemberProtectedRoute>
      <DashboardPage />
    </MemberProtectedRoute>
  )
}
```
