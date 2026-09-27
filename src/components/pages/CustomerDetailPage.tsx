import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Customers, Leads, Opportunities, Followups, SupportTickets } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Image } from '@/components/ui/image';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, FileText, TrendingUp, CheckCircle, AlertCircle, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { useBackendService } from '@/hooks/useBackendService';
import { getCustomer360, Customer360 } from '@/backend/customer-360.web';
import type { AICustomerBrief } from '@/backend/ai-customer-service.web';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { executeWithAuth, error, clearError } = useBackendService();
  const [customer360, setCustomer360] = useState<Customer360 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiBrief, setAIBrief] = useState<AICustomerBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCustomer360();
      loadAIBrief();
    }
  }, [id]);

  const loadCustomer360 = async () => {
    setIsLoading(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await getCustomer360(id!, auth);
    });
    if (result) {
      setCustomer360(result);
    }
    setIsLoading(false);
  };

  const loadAIBrief = async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const response = await fetch(`/api/ai-customer-brief?customerId=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAIBrief(data.data);
      } else if (response.status !== 404) {
        setBriefError('Failed to load AI brief');
      }
    } catch (err) {
      console.error('Error loading AI brief:', err);
      setBriefError('Error loading AI brief');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleGenerateBrief = async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const response = await fetch('/api/ai-customer-brief/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: id,
          isDemo: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAIBrief(data.data);
      } else {
        setBriefError('Failed to generate AI brief');
      }
    } catch (err) {
      console.error('Error generating AI brief:', err);
      setBriefError('Error generating AI brief');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleInvalidateBrief = async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const response = await fetch('/api/ai-customer-brief/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: id
        })
      });

      if (response.ok) {
        setAIBrief(null);
      } else {
        setBriefError('Failed to invalidate AI brief');
      }
    } catch (err) {
      console.error('Error invalidating AI brief:', err);
      setBriefError('Error invalidating AI brief');
    } finally {
      setBriefLoading(false);
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'qualified':
        return 'bg-yellow-100 text-yellow-800';
      case 'proposal':
        return 'bg-purple-100 text-purple-800';
      case 'negotiation':
        return 'bg-orange-100 text-orange-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              onClick={() => navigate('/customers')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
              <p className="font-paragraph">{error.message}</p>
            </div>
          )}

          <div style={{ minHeight: '500px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !customer360 ? (
              <div className="text-center py-12">
                <p className="font-paragraph text-muted-grey-foreground">Customer not found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Customer Overview */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                      {customer360.customer.profilePicture && (
                        <Image
                          src={customer360.customer.profilePicture}
                          alt={customer360.customer.fullName || 'Customer'}
                          width={96}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <CardTitle className="font-heading text-3xl text-foreground mb-4">
                          {customer360.customer.fullName || 'Unknown Customer'}
                        </CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {customer360.customer.email && (
                            <div className="flex items-center space-x-3">
                              <Mail className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer360.customer.email}</span>
                            </div>
                          )}
                          {customer360.customer.phoneNumber && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer360.customer.phoneNumber}</span>
                            </div>
                          )}
                          {customer360.customer.address && (
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer360.customer.address}</span>
                            </div>
                          )}
                          {customer360.customer.city && (
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer360.customer.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Metrics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">{customer360.metrics.totalLeads}</div>
                        <p className="font-paragraph text-muted-grey-foreground">Total Leads</p>
                        <p className="font-paragraph text-sm text-secondary mt-1">{customer360.metrics.activeLeads} Active</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">{customer360.metrics.totalOpportunities}</div>
                        <p className="font-paragraph text-muted-grey-foreground">Opportunities</p>
                        <p className="font-paragraph text-sm text-secondary mt-1">{customer360.metrics.openOpportunities} Open</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">{customer360.metrics.totalFollowups}</div>
                        <p className="font-paragraph text-muted-grey-foreground">Follow-ups</p>
                        <p className="font-paragraph text-sm text-destructive mt-1">{customer360.metrics.overdueFollowups} Overdue</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">{customer360.metrics.openTickets}</div>
                        <p className="font-paragraph text-muted-grey-foreground">Support Tickets</p>
                        <p className="font-paragraph text-sm text-secondary mt-1">Open</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Customer Brief Section */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-accent-gold" />
                      <CardTitle className="font-heading text-2xl">AI Customer Brief</CardTitle>
                    </div>
                    {aiBrief && (
                      <Badge className="bg-green-100 text-green-800">Generated</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {briefError && (
                      <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
                        <p className="font-paragraph text-sm">{briefError}</p>
                      </div>
                    )}

                    {!aiBrief && !briefLoading && (
                      <div className="text-center py-8">
                        <p className="font-paragraph text-muted-grey-foreground mb-4">
                          No AI brief has been generated yet. Click the button below to generate one.
                        </p>
                        <Button
                          onClick={handleGenerateBrief}
                          disabled={briefLoading}
                          className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground"
                        >
                          {briefLoading ? (
                            <>
                              <LoadingSpinner className="h-4 w-4 mr-2" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate AI Brief
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {briefLoading && !aiBrief && (
                      <div className="text-center py-8">
                        <LoadingSpinner className="mx-auto mb-4" />
                        <p className="font-paragraph text-muted-grey-foreground">
                          Generating AI brief... This may take a moment.
                        </p>
                      </div>
                    )}

                    {aiBrief && (
                      <div className="space-y-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            onClick={handleGenerateBrief}
                            disabled={briefLoading}
                            variant="outline"
                            size="sm"
                          >
                            {briefLoading ? (
                              <>
                                <LoadingSpinner className="h-4 w-4 mr-2" />
                                Refreshing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleInvalidateBrief}
                            disabled={briefLoading}
                            variant="outline"
                            size="sm"
                          >
                            Clear
                          </Button>
                        </div>

                        {/* Brief Content */}
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="font-paragraph text-foreground whitespace-pre-wrap text-sm">
                            {aiBrief.briefContent}
                          </p>
                        </div>

                        {/* Key Insights */}
                        {aiBrief.keyInsights && (
                          <div>
                            <h4 className="font-heading text-lg text-foreground mb-3">Key Insights</h4>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="font-paragraph text-sm text-foreground">{aiBrief.keyInsights}</p>
                            </div>
                          </div>
                        )}

                        {/* Recommended Actions */}
                        {aiBrief.recommendedActions && (
                          <div>
                            <h4 className="font-heading text-lg text-foreground mb-3">Recommended Actions</h4>
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="font-paragraph text-sm text-foreground">{aiBrief.recommendedActions}</p>
                            </div>
                          </div>
                        )}

                        {/* Risk Factors */}
                        {aiBrief.riskFactors && (
                          <div>
                            <h4 className="font-heading text-lg text-foreground mb-3">Risk Factors</h4>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="font-paragraph text-sm text-foreground">{aiBrief.riskFactors}</p>
                            </div>
                          </div>
                        )}

                        {/* Opportunities */}
                        {aiBrief.opportunities && (
                          <div>
                            <h4 className="font-heading text-lg text-foreground mb-3">Opportunities</h4>
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="font-paragraph text-sm text-foreground">{aiBrief.opportunities}</p>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="pt-4 border-t border-gray-200">
                          <p className="font-paragraph text-xs text-muted-grey-foreground">
                            Generated {new Date(aiBrief.generatedAt).toLocaleString()} by {aiBrief.aiProvider} ({aiBrief.modelVersion})
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Tabs */}
                <Card className="bg-white border border-gray-200">
                  <Tabs defaultValue="leads" className="w-full">
                    <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent p-0">
                      <TabsTrigger value="leads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Leads ({customer360.leads.length})
                      </TabsTrigger>
                      <TabsTrigger value="opportunities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Opportunities ({customer360.opportunities.length})
                      </TabsTrigger>
                      <TabsTrigger value="followups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Follow-ups ({customer360.followups.length})
                      </TabsTrigger>
                      <TabsTrigger value="support" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Support ({customer360.supportTickets.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="leads" className="p-6">
                      {customer360.leads.length === 0 ? (
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">No leads found</p>
                      ) : (
                        <div className="space-y-4">
                          {customer360.leads.map((lead) => (
                            <div key={lead._id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <h4 className="font-heading text-lg text-foreground mb-2">{lead.requirement || 'Untitled Lead'}</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge className={getStageColor(lead.stage)}>
                                    {lead.stage || 'Unknown'}
                                  </Badge>
                                  <Badge className={getPriorityColor(lead.priority)}>
                                    {lead.priority || 'Medium'}
                                  </Badge>
                                </div>
                                <p className="font-paragraph text-sm text-muted-grey-foreground">
                                  Value: ${lead.value || 0} | Budget: ${lead.budget || 0}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/leads/${lead._id}`)}
                              >
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="opportunities" className="p-6">
                      {customer360.opportunities.length === 0 ? (
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">No opportunities found</p>
                      ) : (
                        <div className="space-y-4">
                          {customer360.opportunities.map((opp) => (
                            <div key={opp._id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <h4 className="font-heading text-lg text-foreground mb-2">{opp.opportunityName || 'Untitled Opportunity'}</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge className={getStageColor(opp.stage)}>
                                    {opp.stage || 'Unknown'}
                                  </Badge>
                                </div>
                                <p className="font-paragraph text-sm text-muted-grey-foreground">
                                  Value: ${opp.pipelineValue || 0} | Probability: {opp.probability || 0}%
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="followups" className="p-6">
                      {customer360.followups.length === 0 ? (
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">No follow-ups found</p>
                      ) : (
                        <div className="space-y-4">
                          {customer360.followups.map((fu) => {
                            const isOverdue = fu.dueDate && new Date(fu.dueDate) < new Date() && fu.status !== 'Completed';
                            return (
                              <div key={fu._id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <h4 className="font-heading text-lg text-foreground mb-2">{fu.title || 'Untitled Follow-up'}</h4>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge className={fu.status === 'Completed' ? 'bg-green-100 text-green-800' : isOverdue ? 'bg-destructive text-destructive-foreground' : 'bg-blue-100 text-blue-800'}>
                                      {fu.status || 'Pending'}
                                    </Badge>
                                  </div>
                                  <p className="font-paragraph text-sm text-muted-grey-foreground">
                                    Due: {fu.dueDate ? new Date(fu.dueDate).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="support" className="p-6">
                      {customer360.supportTickets.length === 0 ? (
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">No support tickets found</p>
                      ) : (
                        <div className="space-y-4">
                          {customer360.supportTickets.map((ticket) => (
                            <div key={ticket._id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <h4 className="font-heading text-lg text-foreground mb-2">{ticket.issueDescription || 'Untitled Ticket'}</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge className={getStatusColor(ticket.status)}>
                                    {ticket.status || 'Open'}
                                  </Badge>
                                  <Badge className={getPriorityColor(ticket.priority)}>
                                    {ticket.priority || 'Medium'}
                                  </Badge>
                                </div>
                                <p className="font-paragraph text-sm text-muted-grey-foreground">
                                  Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>

                {/* Activity Timeline */}
                {customer360.activityTimeline.length > 0 && (
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="font-heading text-2xl">Activity Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {customer360.activityTimeline.slice(0, 10).map((event, idx) => (
                          <div key={idx} className="flex space-x-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-primary mt-2"></div>
                              {idx < customer360.activityTimeline.length - 1 && (
                                <div className="w-0.5 h-12 bg-gray-200 my-2"></div>
                              )}
                            </div>
                            <div className="pb-4">
                              <p className="font-paragraph text-foreground font-semibold">{event.description}</p>
                              <p className="font-paragraph text-sm text-muted-grey-foreground">
                                {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
