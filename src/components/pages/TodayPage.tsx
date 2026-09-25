import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Clock, Users, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TodayPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const operationalCards = [
    {
      title: 'Hot Leads',
      icon: TrendingUp,
      count: 0,
      description: 'High-priority leads requiring immediate attention',
      color: 'text-primary',
      link: '/leads?filter=hot'
    },
    {
      title: 'Follow-ups Due',
      icon: Clock,
      count: 0,
      description: 'Follow-ups scheduled for today',
      color: 'text-secondary',
      link: '/follow-ups?view=today'
    },
    {
      title: 'Needs Attention',
      icon: AlertCircle,
      count: 0,
      description: 'Items requiring your immediate action',
      color: 'text-accent-gold',
      link: '/inbox'
    },
    {
      title: 'Open Support Issues',
      icon: Ticket,
      count: 0,
      description: 'Active support tickets',
      color: 'text-destructive',
      link: '/support?status=open'
    },
    {
      title: 'Active Opportunities',
      icon: Users,
      count: 0,
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
            {mounted && (
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
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
