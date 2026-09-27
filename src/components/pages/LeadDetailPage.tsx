import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Leads, Opportunities, Followups } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, User, MapPin, Calendar, DollarSign, Target, Clock, Plus } from 'lucide-react';
import { useBackendService } from '@/hooks/useBackendService';
import { getLeadAuthorized, updateLeadAuthorized, overrideLeadPriority } from '@/backend/leads-service.web';
import { createOpportunityAuthorized } from '@/backend/opportunities-service.web';
import { createFollowupAuthorized } from '@/backend/followups-service.web';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { executeWithAuth, error, clearError } = useBackendService();
  const [lead, setLead] = useState<Leads | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreateOppDialogOpen, setIsCreateOppDialogOpen] = useState(false);
  const [isCreateFollowupDialogOpen, setIsCreateFollowupDialogOpen] = useState(false);
  const [oppFormData, setOppFormData] = useState({
    opportunityName: '',
    pipelineValue: '',
    expectedCloseDate: '',
  });
  const [followupFormData, setFollowupFormData] = useState({
    title: '',
    dueDate: '',
    owner: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
    setIsLoading(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await getLeadAuthorized(id!, auth);
    });
    if (result) {
      setLead(result);
    }
    setIsLoading(false);
  };

  const handleUpdateStage = async (newStage: string) => {
    if (!lead) return;
    setIsUpdating(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await updateLeadAuthorized(lead._id, { stage: newStage }, auth);
    });
    if (result) {
      setLead(result);
    }
    setIsUpdating(false);
  };

  const handleUpdateOwner = async (newOwner: string) => {
    if (!lead) return;
    setIsUpdating(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await updateLeadAuthorized(lead._id, { owner: newOwner }, auth);
    });
    if (result) {
      setLead(result);
    }
    setIsUpdating(false);
  };

  const handlePriorityOverride = async (newPriority: 'HIGH' | 'MEDIUM' | 'LOW', reason: string) => {
    if (!lead) return;
    setIsUpdating(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await overrideLeadPriority(lead._id, newPriority, reason, auth);
    });
    if (result) {
      setLead(result);
    }
    setIsUpdating(false);
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsUpdating(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await createOpportunityAuthorized({
        opportunityName: oppFormData.opportunityName,
        leadTitle: lead.customer || '',
        pipelineValue: parseFloat(oppFormData.pipelineValue) || 0,
        expectedCloseDate: oppFormData.expectedCloseDate ? new Date(oppFormData.expectedCloseDate) : undefined,
        stage: 'Qualified',
        description: lead.requirement || '',
        owner: lead.owner || '',
        probability: 50,
      }, auth);
    });
    if (result) {
      setIsCreateOppDialogOpen(false);
      setOppFormData({ opportunityName: '', pipelineValue: '', expectedCloseDate: '' });
      loadLead();
    }
    setIsUpdating(false);
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsUpdating(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await createFollowupAuthorized({
        title: followupFormData.title,
        dueDate: followupFormData.dueDate ? new Date(followupFormData.dueDate) : undefined,
        status: 'Pending',
        relatedRecordType: 'Lead',
        relatedRecordId: lead._id,
        owner: followupFormData.owner || lead.owner || '',
        notes: followupFormData.notes,
      }, auth);
    });
    if (result) {
      setIsCreateFollowupDialogOpen(false);
      setFollowupFormData({ title: '', dueDate: '', owner: '', notes: '' });
      loadLead();
    }
    setIsUpdating(false);
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

  const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

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
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/leads?edit=${lead._id}`)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Edit Lead
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-muted-grey mt-1" />
                        <div className="flex-1">
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Owner
                          </p>
                          <div className="flex gap-2 items-center">
                            <p className="font-paragraph text-foreground">
                              {lead.owner || 'Not assigned'}
                            </p>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">Assign</Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white">
                                <DialogHeader>
                                  <DialogTitle>Assign Owner</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="owner">Owner Name</Label>
                                    <Input
                                      id="owner"
                                      defaultValue={lead.owner || ''}
                                      placeholder="Enter owner name"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateOwner((e.target as HTMLInputElement).value);
                                        }
                                      }}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      const input = document.getElementById('owner') as HTMLInputElement;
                                      handleUpdateOwner(input.value);
                                    }}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
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

                    {lead.priorityOverride && (
                      <div className="pt-6 border-t border-gray-200 bg-accent-gold/10 p-4 rounded">
                        <h3 className="font-heading text-lg text-foreground mb-2">
                          Priority Override
                        </h3>
                        <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                          Reason: {lead.priorityOverrideReason || 'No reason provided'}
                        </p>
                        <p className="font-paragraph text-xs text-muted-grey-foreground">
                          By: {lead.priorityOverrideBy || 'Unknown'} on{' '}
                          {lead.priorityOverrideDate
                            ? new Date(lead.priorityOverrideDate).toLocaleDateString('en-IN')
                            : 'Unknown date'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stage Management */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl text-foreground">
                      Stage Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-paragraph text-sm text-muted-grey-foreground mb-3">
                          Current Stage: <Badge className={getStageColor(lead.stage)}>{lead.stage || 'New'}</Badge>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {stages.map((stage) => (
                            <Button
                              key={stage}
                              variant={lead.stage === stage ? 'default' : 'outline'}
                              onClick={() => handleUpdateStage(stage)}
                              disabled={isUpdating}
                              className={lead.stage === stage ? 'bg-primary text-primary-foreground' : ''}
                            >
                              {stage}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Priority Management */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl text-foreground">
                      Priority Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="font-paragraph text-sm text-muted-grey-foreground">
                        Current Priority: <Badge className={getPriorityColor(lead.priority)}>{lead.priority || 'Medium'}</Badge>
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline">Override Priority</Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white">
                          <DialogHeader>
                            <DialogTitle>Override Priority</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="priority">New Priority</Label>
                              <select
                                id="priority"
                                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white font-paragraph"
                              >
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reason">Reason</Label>
                              <textarea
                                id="reason"
                                placeholder="Why are you overriding the priority?"
                                className="w-full min-h-24 px-3 py-2 rounded-md border border-gray-200 bg-white font-paragraph"
                              />
                            </div>
                            <Button
                              onClick={() => {
                                const priority = (document.getElementById('priority') as HTMLSelectElement).value as 'HIGH' | 'MEDIUM' | 'LOW';
                                const reason = (document.getElementById('reason') as HTMLTextAreaElement).value;
                                handlePriorityOverride(priority, reason);
                              }}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Override
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Create Opportunity */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl text-foreground">
                      Create Opportunity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={isCreateOppDialogOpen} onOpenChange={setIsCreateOppDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Plus className="h-4 w-4 mr-2" />
                          New Opportunity
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-white">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-2xl">Create Opportunity</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateOpportunity} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="oppName">Opportunity Name *</Label>
                            <Input
                              id="oppName"
                              required
                              value={oppFormData.opportunityName}
                              onChange={(e) => setOppFormData({ ...oppFormData, opportunityName: e.target.value })}
                              placeholder="e.g., Website Redesign Project"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="oppValue">Pipeline Value</Label>
                              <Input
                                id="oppValue"
                                type="number"
                                value={oppFormData.pipelineValue}
                                onChange={(e) => setOppFormData({ ...oppFormData, pipelineValue: e.target.value })}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="oppDate">Expected Close Date</Label>
                              <Input
                                id="oppDate"
                                type="date"
                                value={oppFormData.expectedCloseDate}
                                onChange={(e) => setOppFormData({ ...oppFormData, expectedCloseDate: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsCreateOppDialogOpen(false);
                                setOppFormData({ opportunityName: '', pipelineValue: '', expectedCloseDate: '' });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isUpdating}>
                              {isUpdating ? 'Creating...' : 'Create Opportunity'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                {/* Create Follow-up */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl text-foreground">
                      Create Follow-up
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={isCreateFollowupDialogOpen} onOpenChange={setIsCreateFollowupDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Plus className="h-4 w-4 mr-2" />
                          New Follow-up
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-white">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-2xl">Create Follow-up</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateFollowup} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="fuTitle">Title *</Label>
                            <Input
                              id="fuTitle"
                              required
                              value={followupFormData.title}
                              onChange={(e) => setFollowupFormData({ ...followupFormData, title: e.target.value })}
                              placeholder="Follow-up title"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fuDate">Due Date</Label>
                              <Input
                                id="fuDate"
                                type="date"
                                value={followupFormData.dueDate}
                                onChange={(e) => setFollowupFormData({ ...followupFormData, dueDate: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="fuOwner">Owner</Label>
                              <Input
                                id="fuOwner"
                                value={followupFormData.owner}
                                onChange={(e) => setFollowupFormData({ ...followupFormData, owner: e.target.value })}
                                placeholder="Assigned to"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fuNotes">Notes</Label>
                            <textarea
                              id="fuNotes"
                              value={followupFormData.notes}
                              onChange={(e) => setFollowupFormData({ ...followupFormData, notes: e.target.value })}
                              placeholder="Additional notes..."
                              className="w-full min-h-24 px-3 py-2 rounded-md border border-gray-200 bg-white font-paragraph"
                            />
                          </div>

                          <div className="flex justify-end space-x-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsCreateFollowupDialogOpen(false);
                                setFollowupFormData({ title: '', dueDate: '', owner: '', notes: '' });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isUpdating}>
                              {isUpdating ? 'Creating...' : 'Create Follow-up'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
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
