import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMember } from '@/integrations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, TrendingUp, Clock, Users, Ticket, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBackendService } from '@/hooks/useBackendService';
import { getTodayDashboard } from '@/backend/today-service.web';

export default function TodayPage() {
  const { member } = useMember();
  const { executeWithAuth } = useBackendService();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    hotLeads: 0,
    followupsDueToday: 0,
    overdueFollowups: 0,
    openOpportunities: 0,
    openTickets: 0,
  });

  useEffect(() => {
    setMounted(true);
    loadDashboard();
  }, [member]);

  const loadDashboard = async () => {
    setIsLoading(true);
    const result = await executeWithAuth(async (auth) => {
      return await getTodayDashboard(auth);
    });
    if (result) {
      setMetrics({
        hotLeads: result.highPriorityLeads.length,
        followupsDueToday: result.followupsDueToday.length,
        overdueFollowups: result.overdueFollowups.length,
        openOpportunities: result.opportunitiesWithoutAction.length,
        openTickets: result.unresolvedTickets.length,
      });
    }
    setIsLoading(false);
  };

  const operationalCards = [
    {
      title: 'Hot Leads',
      icon: TrendingUp,
      count: metrics.hotLeads,
      description: 'High-priority leads requiring immediate attention',
      color: 'text-primary',
      link: '/leads?filter=hot'
    },
    {
      title: 'Follow-ups Due',
      icon: Clock,
      count: metrics.followupsDueToday,
      description: 'Follow-ups scheduled for today',
      color: 'text-secondary',
      link: '/follow-ups?view=today'
    },
    {
      title: 'Overdue Items',
      icon: AlertCircle,
      count: metrics.overdueFollowups,
      description: 'Items requiring your immediate action',
      color: 'text-accent-gold',
      link: '/follow-ups?view=overdue'
    },
    {
      title: 'Open Support Issues',
      icon: Ticket,
      count: metrics.openTickets,
      description: 'Active support tickets',
      color: 'text-destructive',
      link: '/support?status=open'
    },
    {
      title: 'Active Opportunities',
      icon: Users,
      count: metrics.openOpportunities,
      description: 'Opportunities in progress',
      color: 'text-secondary',
      link: '/leads?view=opportunities'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-8">
            <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">
              Today
            </h1>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Your operational dashboard at a glance
            </p>
          </div>

          <div style={{ minHeight: '400px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <LoadingSpinner />
              </div>
            ) : mounted ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {operationalCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Link to={card.link}>
                        <Card className="bg-white border border-gray-200 hover:border-primary/50 transition-colors h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <Icon className={`h-8 w-8 ${card.color}`} />
                              <span className="font-heading text-4xl text-foreground">
                                {card.count}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardTitle className="font-heading text-2xl text-foreground mb-2">
                              {card.title}
                            </CardTitle>
                            <p className="font-paragraph text-sm text-muted-grey-foreground">
                              {card.description}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Empty state */}
          {mounted && !isLoading && metrics.hotLeads === 0 && metrics.followupsDueToday === 0 && (
            <div className="mt-12 text-center">
              <CheckCircle className="h-16 w-16 text-secondary mx-auto mb-4 opacity-50" />
              <h2 className="font-heading text-2xl text-foreground mb-2">All caught up!</h2>
              <p className="font-paragraph text-muted-grey-foreground">
                No urgent items require your attention right now.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
