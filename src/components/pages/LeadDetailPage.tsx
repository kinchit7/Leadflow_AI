import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BaseCrudService } from '@/integrations';
import { Leads } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, User, MapPin, Calendar, DollarSign, Target, Clock } from 'lucide-react';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Leads | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
    setIsLoading(true);
    try {
      const data = await BaseCrudService.getById<Leads>('leads', id!);
      setLead(data);
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'low':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'new':
        return 'bg-secondary text-secondary-foreground';
      case 'contacted':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'qualified':
        return 'bg-primary text-primary-foreground';
      case 'proposal':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'won':
        return 'bg-secondary text-secondary-foreground';
      case 'lost':
        return 'bg-muted-grey text-muted-grey-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/leads')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </div>

          <div style={{ minHeight: '500px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !lead ? (
              <div className="text-center py-12">
                <p className="font-paragraph text-muted-grey-foreground">Lead not found</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start justify-between space-y-4 md:space-y-0">
                      <div>
                        <CardTitle className="font-heading text-3xl text-foreground mb-2">
                          {lead.customer || 'Unknown Customer'}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getStageColor(lead.stage)}>
                            {lead.stage || 'New'}
                          </Badge>
                          <Badge className={getPriorityColor(lead.priority)}>
                            {lead.priority || 'Medium'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigate(`/leads?edit=${lead._id}`)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Edit Lead
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Owner
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.owner || 'Not assigned'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <DollarSign className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Value
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.value ? `₹${lead.value.toLocaleString('en-IN')}` : 'Not specified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <DollarSign className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Budget
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.budget ? `₹${lead.budget.toLocaleString('en-IN')}` : 'Not specified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Location
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.location || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Target className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Source
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.source || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Clock className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Timeline
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.timeline || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Next Follow-up
                          </p>
                          <p className="font-paragraph text-foreground">
                            {lead.nextFollowUp
                              ? new Date(lead.nextFollowUp).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : 'Not scheduled'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {lead.requirement && (
                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="font-heading text-xl text-foreground mb-3">
                          Requirement
                        </h3>
                        <p className="font-paragraph text-foreground whitespace-pre-wrap">
                          {lead.requirement}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
