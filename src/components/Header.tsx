import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMember } from '@/integrations';
import DemoModeToggle from '@/components/DemoModeToggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bell,
  Plus,
  Building2,
  User,
  Settings,
  LogOut,
  Menu,
  Sparkles,
  Home,
  Inbox,
  Users,
  TrendingUp,
  Clock,
  Ticket,
  BarChart3,
  Radio,
  UsersRound,
  Brain,
  Wallet,
} from 'lucide-react';

export default function Header() {
  const { member, isAuthenticated, actions } = useMember();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavigation = [
    { name: 'Today', href: '/today', icon: Home },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Leads', href: '/leads', icon: TrendingUp },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Follow-ups', href: '/follow-ups', icon: Clock },
    { name: 'Support', href: '/support', icon: Ticket },
    { name: 'Insights', href: '/insights', icon: BarChart3 },
  ];

  const secondaryNavigation = [
    { name: 'Channels', href: '/channels', icon: Radio },
    { name: 'Team', href: '/team', icon: UsersRound },
    { name: 'Business Brain', href: '/business-brain', icon: Brain },
    { name: 'Billing & Wallet', href: '/billing', icon: Wallet },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    actions.logout();
  };

  if (!isAuthenticated) {
    return (
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="font-heading text-2xl text-foreground">LeadFlow AI</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="font-heading text-2xl text-foreground hidden sm:inline">
                LeadFlow AI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center space-x-1">
              {mainNavigation.map((item) => (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant="ghost"
                    className="text-foreground hover:text-primary hover:bg-primary/5"
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Search */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-grey" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 w-64 bg-background border-gray-200"
              />
            </div>

            {/* Ask LeadFlow */}
            <Button
              variant="outline"
              className="hidden lg:flex items-center space-x-2 border-primary text-primary hover:bg-primary/5"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask LeadFlow</span>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-foreground" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-white text-xs">
                    0
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-heading text-lg">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-4 text-center text-muted-grey-foreground font-paragraph text-sm">
                  No new notifications
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* New Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/leads?action=new')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  New Lead
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/customers?action=new')}>
                  <Users className="h-4 w-4 mr-2" />
                  New Customer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/follow-ups?action=new')}>
                  <Clock className="h-4 w-4 mr-2" />
                  New Follow-up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/support?action=new')}>
                  <Ticket className="h-4 w-4 mr-2" />
                  New Ticket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Business Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden lg:flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-paragraph">My Business</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-heading">
                  Business & Branch
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Building2 className="h-4 w-4 mr-2" />
                  Main Branch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Demo controls are backend-authorized and fail closed for non-admin users. */}
            <DemoModeToggle />

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-heading">
                  {member?.profile?.nickname || member?.contact?.firstName || 'User'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white">
                <div className="flex flex-col space-y-6 mt-8">
                  <div>
                    <h3 className="font-heading text-lg text-foreground mb-3">Main</h3>
                    <nav className="flex flex-col space-y-1">
                      {mainNavigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5"
                            >
                              <Icon className="h-5 w-5 mr-3" />
                              {item.name}
                            </Button>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  <div>
                    <h3 className="font-heading text-lg text-foreground mb-3">More</h3>
                    <nav className="flex flex-col space-y-1">
                      {secondaryNavigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/5"
                            >
                              <Icon className="h-5 w-5 mr-3" />
                              {item.name}
                            </Button>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
