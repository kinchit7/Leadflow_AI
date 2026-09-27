import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Opportunities } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, DollarSign, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBackendService } from '@/hooks/useBackendService';
import { getOpportunitiesForBusiness, createOpportunityAuthorized, updateOpportunityAuthorized } from '@/backend/opportunities-service.web';

export default function OpportunitiesPage() {
  const [searchParams] = useSearchParams();
  const { executeWithAuth } = useBackendService();
  const [opportunities, setOpportunities] = useState<Opportunities[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    opportunityName: '',
    leadTitle: '',
    pipelineValue: '',
    stage: 'Qualified',
    expectedCloseDate: '',
    owner: '',
    probability: '50',
  });

  useEffect(() => {
    loadOpportunities();
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadOpportunities = async () => {
    setIsLoading(true);
    const result = await executeWithAuth(async (auth) => {
      return await getOpportunitiesForBusiness(auth);
    });
    if (result) {
      setOpportunities(result.items);
    }
    setIsLoading(false);
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await executeWithAuth(async (auth) => {
      return await createOpportunityAuthorized({
        opportunityName: formData.opportunityName,
        leadTitle: formData.leadTitle,
        pipelineValue: parseFloat(formData.pipelineValue) || 0,
        stage: formData.stage,
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : undefined,
        owner: formData.owner,
        probability: parseFloat(formData.probability) || 50,
      }, auth);
    });
    if (result) {
      setIsCreateDialogOpen(false);
      setFormData({
        opportunityName: '',
        leadTitle: '',
        pipelineValue: '',
        stage: 'Qualified',
        expectedCloseDate: '',
        owner: '',
        probability: '50',
      });
      loadOpportunities();
    }
  };

  const handleUpdateStage = async (oppId: string, newStage: string) => {
    const result = await executeWithAuth(async (auth) => {
      return await updateOpportunityAuthorized(oppId, { stage: newStage }, auth);
    });
    if (result) {
      loadOpportunities();
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'qualified':
        return 'bg-secondary text-secondary-foreground';
      case 'proposal':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'negotiation':
        return 'bg-primary text-primary-foreground';
      case 'won':
        return 'bg-secondary text-secondary-foreground';
      case 'lost':
        return 'bg-muted-grey text-muted-grey-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
    }
  };

  const stages = ['Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  const categorizeOpportunities = () => {
    return {
      qualified: opportunities.filter((o) => o.stage === 'Qualified'),
      proposal: opportunities.filter((o) => o.stage === 'Proposal'),
      negotiation: opportunities.filter((o) => o.stage === 'Negotiation'),
      won: opportunities.filter((o) => o.stage === 'Won'),
      lost: opportunities.filter((o) => o.stage === 'Lost'),
    };
  };

  const categorized = categorizeOpportunities();

  const OpportunityList = ({ items }: { items: Opportunities[] }) => (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-paragraph text-muted-grey-foreground">No opportunities</p>
        </div>
      ) : (
        items.map((opp) => (
          <motion.div
            key={opp._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white border border-gray-200 p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-heading text-xl text-foreground mb-1">
                    {opp.opportunityName || 'Untitled'}
                  </h3>
                  <p className="font-paragraph text-sm text-muted-grey-foreground mb-3">
                    {opp.leadTitle || 'No lead associated'}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getStageColor(opp.stage)}>
                      {opp.stage || 'Qualified'}
                    </Badge>
                    {opp.pipelineValue && (
                      <Badge variant="outline" className="font-paragraph">
                        ₹{opp.pipelineValue.toLocaleString('en-IN')}
                      </Badge>
                    )}
                    {opp.probability && (
                      <Badge variant="outline" className="font-paragraph">
                        {opp.probability}% probability
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-grey" />
                  <span className="font-paragraph text-sm text-muted-grey-foreground">
                    {opp.expectedCloseDate
                      ? new Date(opp.expectedCloseDate).toLocaleDateString('en-IN')
                      : 'No date'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-grey" />
                  <span className="font-paragraph text-sm text-muted-grey-foreground">
                    {opp.owner || 'Unassigned'}
                  </span>
                </div>
                <div className="flex gap-1">
                  {stages.map((stage) => (
                    <Button
                      key={stage}
                      size="sm"
                      variant={opp.stage === stage ? 'default' : 'outline'}
                      onClick={() => handleUpdateStage(opp._id, stage)}
                      className={opp.stage === stage ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {stage}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
            <div>
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Opportunities</h1>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Manage your sales pipeline
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5 mr-2" />
                  New Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">Create New Opportunity</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOpportunity} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Opportunity Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.opportunityName}
                      onChange={(e) => setFormData({ ...formData, opportunityName: e.target.value })}
                      placeholder="e.g., Website Redesign"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead">Associated Lead</Label>
                    <Input
                      id="lead"
                      value={formData.leadTitle}
                      onChange={(e) => setFormData({ ...formData, leadTitle: e.target.value })}
                      placeholder="Lead name or ID"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="value">Pipeline Value</Label>
                      <Input
                        id="value"
                        type="number"
                        value={formData.pipelineValue}
                        onChange={(e) => setFormData({ ...formData, pipelineValue: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="probability">Probability (%)</Label>
                      <Input
                        id="probability"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                        placeholder="50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage">Stage</Label>
                      <select
                        id="stage"
                        value={formData.stage}
                        onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white font-paragraph"
                      >
                        {stages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="closeDate">Expected Close Date</Label>
                      <Input
                        id="closeDate"
                        type="date"
                        value={formData.expectedCloseDate}
                        onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Input
                      id="owner"
                      value={formData.owner}
                      onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                      placeholder="Team member"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setFormData({
                          opportunityName: '',
                          leadTitle: '',
                          pipelineValue: '',
                          stage: 'Qualified',
                          expectedCloseDate: '',
                          owner: '',
                          probability: '50',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Create Opportunity
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div style={{ minHeight: '500px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <Tabs defaultValue="qualified" className="w-full">
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="qualified" className="font-paragraph">
                    Qualified ({categorized.qualified.length})
                  </TabsTrigger>
                  <TabsTrigger value="proposal" className="font-paragraph">
                    Proposal ({categorized.proposal.length})
                  </TabsTrigger>
                  <TabsTrigger value="negotiation" className="font-paragraph">
                    Negotiation ({categorized.negotiation.length})
                  </TabsTrigger>
                  <TabsTrigger value="won" className="font-paragraph">
                    Won ({categorized.won.length})
                  </TabsTrigger>
                  <TabsTrigger value="lost" className="font-paragraph">
                    Lost ({categorized.lost.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qualified" className="mt-6">
                  <OpportunityList items={categorized.qualified} />
                </TabsContent>

                <TabsContent value="proposal" className="mt-6">
                  <OpportunityList items={categorized.proposal} />
                </TabsContent>

                <TabsContent value="negotiation" className="mt-6">
                  <OpportunityList items={categorized.negotiation} />
                </TabsContent>

                <TabsContent value="won" className="mt-6">
                  <OpportunityList items={categorized.won} />
                </TabsContent>

                <TabsContent value="lost" className="mt-6">
                  <OpportunityList items={categorized.lost} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
