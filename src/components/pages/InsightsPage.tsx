import { useEffect, useState } from 'react';
import { useMember } from '@/integrations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TrendingUp, TrendingDown, Users, DollarSign, Ticket, Clock } from 'lucide-react';

export default function InsightsPage() {
  const { member } = useMember();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState([
    {
      title: 'Total Leads',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: TrendingUp,
    },
    {
      title: 'Qualified Leads',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: TrendingUp,
    },
    {
      title: 'Won Deals',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: TrendingUp,
    },
    {
      title: 'Lost Deals',
      value: '0',
      change: '+0%',
      trend: 'down',
      icon: TrendingDown,
    },
    {
      title: 'Open Opportunities',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: Users,
    },
    {
      title: 'Pipeline Value',
      value: '$0',
      change: '+0%',
      trend: 'up',
      icon: DollarSign,
    },
    {
      title: 'Follow-ups',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: Clock,
    },
    {
      title: 'Support Issues',
      value: '0',
      change: '+0%',
      trend: 'down',
      icon: Ticket,
    },
  ]);

  useEffect(() => {
    // TODO: Load real metrics from backend
    setIsLoading(false);
  }, [member]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-8">
            <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Insights</h1>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Analytics and performance metrics
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <Card key={metric.title} className="bg-white border border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-paragraph text-sm text-muted-grey-foreground">
                            {metric.title}
                          </CardTitle>
                          <Icon className="h-5 w-5 text-muted-grey" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="font-heading text-3xl text-foreground mb-1">
                              {metric.value}
                            </p>
                            <p
                              className={`font-paragraph text-sm ${
                                metric.trend === 'up' ? 'text-secondary' : 'text-muted-grey-foreground'
                              }`}
                            >
                              {metric.change} from last period
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8">
                <Card className="bg-white border border-gray-200">
                  <CardContent className="p-12 text-center">
                    <p className="font-paragraph text-muted-grey-foreground">
                      Detailed analytics charts will be available once you start collecting data
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
