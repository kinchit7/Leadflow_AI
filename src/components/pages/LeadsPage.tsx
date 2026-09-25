import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BaseCrudService } from '@/integrations';
import { Leads } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Eye, Edit, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LeadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Leads[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Leads | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    source: '',
    priority: 'Medium',
    stage: 'New',
    owner: '',
    value: '',
    requirement: '',
    budget: '',
    location: '',
    timeline: '',
    nextFollowUp: '',
  });

  useEffect(() => {
    loadLeads();
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const result = await BaseCrudService.getAll<Leads>('leads');
      setLeads(result.items);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await BaseCrudService.create('leads', {
        _id: crypto.randomUUID(),
        customer: formData.customer,
        source: formData.source,
        priority: formData.priority,
        stage: formData.stage,
        owner: formData.owner,
        value: parseFloat(formData.value) || 0,
        requirement: formData.requirement,
        budget: parseFloat(formData.budget) || 0,
        location: formData.location,
        timeline: formData.timeline,
        nextFollowUp: formData.nextFollowUp ? new Date(formData.nextFollowUp).toISOString() : undefined,
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      await BaseCrudService.update('leads', {
        _id: selectedLead._id,
        customer: formData.customer,
        source: formData.source,
        priority: formData.priority,
        stage: formData.stage,
        owner: formData.owner,
        value: parseFloat(formData.value) || 0,
        requirement: formData.requirement,
        budget: parseFloat(formData.budget) || 0,
        location: formData.location,
        timeline: formData.timeline,
        nextFollowUp: formData.nextFollowUp ? new Date(formData.nextFollowUp).toISOString() : undefined,
      });
      setIsEditDialogOpen(false);
      setSelectedLead(null);
      resetForm();
      loadLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      source: '',
      priority: 'Medium',
      stage: 'New',
      owner: '',
      value: '',
      requirement: '',
      budget: '',
      location: '',
      timeline: '',
      nextFollowUp: '',
    });
  };

  const openEditDialog = (lead: Leads) => {
    setSelectedLead(lead);
    setFormData({
      customer: lead.customer || '',
      source: lead.source || '',
      priority: lead.priority || 'Medium',
      stage: lead.stage || 'New',
      owner: lead.owner || '',
      value: lead.value?.toString() || '',
      requirement: lead.requirement || '',
      budget: lead.budget?.toString() || '',
      location: lead.location || '',
      timeline: lead.timeline || '',
      nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const filteredLeads = leads.filter((lead) =>
    lead.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.requirement?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const LeadForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer">Customer Name *</Label>
          <Input
            id="customer"
            required
            value={formData.customer}
            onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
            placeholder="Enter customer name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            placeholder="e.g., Website, Referral"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white font-paragraph"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <select
            id="stage"
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white font-paragraph"
          >
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner">Owner</Label>
          <Input
            id="owner"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            placeholder="Assigned to"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">Value (₹)</Label>
          <Input
            id="value"
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Budget (₹)</Label>
          <Input
            id="budget"
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="City, State"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeline">Timeline</Label>
          <Input
            id="timeline"
            value={formData.timeline}
            onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
            placeholder="e.g., 2-3 months"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextFollowUp">Next Follow-up</Label>
          <Input
            id="nextFollowUp"
            type="date"
            value={formData.nextFollowUp}
            onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirement">Requirement</Label>
        <textarea
          id="requirement"
          value={formData.requirement}
          onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
          placeholder="Describe the requirement..."
          className="w-full min-h-24 px-3 py-2 rounded-md border border-gray-200 bg-white font-paragraph"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            isEdit ? setIsEditDialogOpen(false) : setIsCreateDialogOpen(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isEdit ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
            <div>
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Leads</h1>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Track and manage your sales pipeline
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5 mr-2" />
                  New Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">Create New Lead</DialogTitle>
                </DialogHeader>
                <LeadForm onSubmit={handleCreateLead} isEdit={false} />
              </DialogContent>
            </Dialog>
          </div>

          <div style={{ minHeight: '500px' }}>
            <Card className="bg-white border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-grey" />
                  <Input
                    type="search"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-200"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-grey mb-4" />
                    <p className="font-paragraph text-muted-grey-foreground">
                      {searchQuery ? 'No leads found' : 'No leads yet. Create your first lead to get started.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-heading">Customer</TableHead>
                        <TableHead className="font-heading">Stage</TableHead>
                        <TableHead className="font-heading">Priority</TableHead>
                        <TableHead className="font-heading">Value</TableHead>
                        <TableHead className="font-heading">Owner</TableHead>
                        <TableHead className="font-heading">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <motion.tr
                          key={lead._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-gray-200"
                        >
                          <TableCell className="font-paragraph font-semibold">
                            {lead.customer || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStageColor(lead.stage)}>
                              {lead.stage || 'New'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(lead.priority)}>
                              {lead.priority || 'Medium'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-paragraph">
                            {lead.value ? `₹${lead.value.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="font-paragraph">
                            {lead.owner || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/leads/${lead._id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(lead)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Edit Lead</DialogTitle>
          </DialogHeader>
          <LeadForm onSubmit={handleUpdateLead} isEdit={true} />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
