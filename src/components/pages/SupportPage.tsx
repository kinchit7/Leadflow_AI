import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupportTickets } from '@/entities';
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
import { Plus, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBackendService } from '@/hooks/useBackendService';
import { getSupportTicketsForBusiness, createSupportTicketAuthorized, updateSupportTicketAuthorized } from '@/backend/support-service.web';

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const { executeWithAuth } = useBackendService();
  const [tickets, setTickets] = useState<SupportTickets[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    issueDescription: '',
    priority: 'Medium',
    assignedTo: '',
  });

  useEffect(() => {
    loadTickets();
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadTickets = async () => {
    setIsLoading(true);
    const result = await executeWithAuth(async (auth) => {
      return await getSupportTicketsForBusiness(auth);
    });
    if (result) {
      setTickets(result.items);
    }
    setIsLoading(false);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await executeWithAuth(async (auth) => {
      return await createSupportTicketAuthorized({
        customerName: formData.customerName,
        issueDescription: formData.issueDescription,
        status: 'Open',
        priority: formData.priority,
        assignedTo: formData.assignedTo,
      }, auth);
    });
    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
      loadTickets();
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      issueDescription: '',
      priority: 'Medium',
      assignedTo: '',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-secondary text-secondary-foreground';
      case 'waiting':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'escalated':
        return 'bg-destructive text-destructive-foreground';
      case 'resolved':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
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

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    const result = await executeWithAuth(async (auth) => {
      return await updateSupportTicketAuthorized(ticketId, { status: newStatus }, auth);
    });
    if (result) {
      loadTickets();
    }
  };

  const categorizeTickets = () => {
    return {
      open: tickets.filter((t) => t.status === 'Open'),
      waiting: tickets.filter((t) => t.status === 'Waiting'),
      escalated: tickets.filter((t) => t.status === 'Escalated'),
      resolved: tickets.filter((t) => t.status === 'Resolved'),
    };
  };

  const categorized = categorizeTickets();

  const TicketList = ({ items }: { items: SupportTickets[] }) => (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-paragraph text-muted-grey-foreground">No tickets</p>
        </div>
      ) : (
        items.map((ticket) => (
          <motion.div
            key={ticket._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white border border-gray-200 p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-heading text-xl text-foreground mb-1">
                    {ticket.customerName || 'Unknown Customer'}
                  </h3>
                  <p className="font-paragraph text-sm text-muted-grey-foreground">
                    {ticket.issueDescription || 'No description'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status || 'Open'}
                </Badge>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority || 'Medium'}
                </Badge>
                {ticket.assignedTo && (
                  <Badge variant="outline" className="font-paragraph">
                    {ticket.assignedTo}
                  </Badge>
                )}
                {ticket.createdAt && (
                  <Badge variant="outline" className="font-paragraph">
                    {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-gray-200">
                {['Open', 'Waiting', 'Escalated', 'Resolved'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={ticket.status === status ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus(ticket._id, status)}
                    className={ticket.status === status ? 'bg-primary text-primary-foreground' : ''}
                  >
                    {status}
                  </Button>
                ))}
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
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Support</h1>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Manage customer support tickets
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5 mr-2" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">Create New Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDescription">Issue Description *</Label>
                    <textarea
                      id="issueDescription"
                      required
                      value={formData.issueDescription}
                      onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                      placeholder="Describe the issue..."
                      className="w-full min-h-32 px-3 py-2 rounded-md border border-gray-200 bg-white font-paragraph"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label htmlFor="assignedTo">Assigned To</Label>
                      <Input
                        id="assignedTo"
                        value={formData.assignedTo}
                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        placeholder="Team member"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Create Ticket
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
              <Tabs defaultValue="open" className="w-full">
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="open" className="font-paragraph">
                    Open ({categorized.open.length})
                  </TabsTrigger>
                  <TabsTrigger value="waiting" className="font-paragraph">
                    Waiting ({categorized.waiting.length})
                  </TabsTrigger>
                  <TabsTrigger value="escalated" className="font-paragraph">
                    Escalated ({categorized.escalated.length})
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="font-paragraph">
                    Resolved ({categorized.resolved.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="open" className="mt-6">
                  <TicketList items={categorized.open} />
                </TabsContent>

                <TabsContent value="waiting" className="mt-6">
                  <TicketList items={categorized.waiting} />
                </TabsContent>

                <TabsContent value="escalated" className="mt-6">
                  <TicketList items={categorized.escalated} />
                </TabsContent>

                <TabsContent value="resolved" className="mt-6">
                  <TicketList items={categorized.resolved} />
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
