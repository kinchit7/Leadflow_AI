import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Followups } from '@/entities';
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
import { Plus, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBackendService } from '@/hooks/useBackendService';
import { getFollowupsForBusiness, createFollowupAuthorized, updateFollowupAuthorized } from '@/backend/followups-service.web';

export default function FollowUpsPage() {
  const [searchParams] = useSearchParams();
  const { executeWithAuth } = useBackendService();
  const [followups, setFollowups] = useState<Followups[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    relatedRecordType: '',
    relatedRecordId: '',
    owner: '',
    notes: '',
  });

  useEffect(() => {
    loadFollowups();
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadFollowups = async () => {
    setIsLoading(true);
    const result = await executeWithAuth(async (auth) => {
      return await getFollowupsForBusiness(auth);
    });
    if (result) {
      setFollowups(result.items);
    }
    setIsLoading(false);
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await executeWithAuth(async (auth) => {
      return await createFollowupAuthorized({
        title: formData.title,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        status: 'Pending',
        relatedRecordType: formData.relatedRecordType,
        relatedRecordId: formData.relatedRecordId,
        owner: formData.owner,
        notes: formData.notes,
      }, auth);
    });
    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
      loadFollowups();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      dueDate: '',
      relatedRecordType: '',
      relatedRecordId: '',
      owner: '',
      notes: '',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-secondary text-secondary-foreground';
      case 'pending':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
    }
  };

  const categorizeFollowups = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      today: followups.filter((f) => {
        if (!f.dueDate || f.status === 'Completed') return false;
        const dueDate = new Date(f.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }),
      overdue: followups.filter((f) => {
        if (!f.dueDate || f.status === 'Completed') return false;
        const dueDate = new Date(f.dueDate);
        return dueDate < today;
      }),
      upcoming: followups.filter((f) => {
        if (!f.dueDate || f.status === 'Completed') return false;
        const dueDate = new Date(f.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= tomorrow;
      }),
      completed: followups.filter((f) => f.status === 'Completed'),
    };
  };

  const categorized = categorizeFollowups();

  const FollowupList = ({ items }: { items: Followups[] }) => (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-paragraph text-muted-grey-foreground">No follow-ups</p>
        </div>
      ) : (
        items.map((followup) => (
          <motion.div
            key={followup._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white border border-gray-200 p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-heading text-xl text-foreground mb-2">
                    {followup.title || 'Untitled'}
                  </h3>
                  {followup.notes && (
                    <p className="font-paragraph text-sm text-muted-grey-foreground mb-3">
                      {followup.notes}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getStatusColor(followup.status)}>
                      {followup.status || 'Pending'}
                    </Badge>
                    {followup.dueDate && (
                      <Badge variant="outline" className="font-paragraph">
                        {new Date(followup.dueDate).toLocaleDateString('en-IN')}
                      </Badge>
                    )}
                    {followup.owner && (
                      <Badge variant="outline" className="font-paragraph">
                        {followup.owner}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    const result = await executeWithAuth(async (auth) => {
                      return await updateFollowupAuthorized(followup._id, {
                        status: followup.status === 'Completed' ? 'Pending' : 'Completed',
                      }, auth);
                    });
                    if (result) {
                      loadFollowups();
                    }
                  }}
                >
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      followup.status === 'Completed' ? 'text-secondary' : 'text-muted-grey'
                    }`}
                  />
                </Button>
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
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Follow-ups</h1>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Track and manage your follow-up tasks
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5 mr-2" />
                  New Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">Create New Follow-up</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateFollowup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Follow-up title"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      className="w-full min-h-24 px-3 py-2 rounded-md border border-gray-200 bg-white font-paragraph"
                    />
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
                      Create Follow-up
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
              <Tabs defaultValue="today" className="w-full">
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="today" className="font-paragraph">
                    Today ({categorized.today.length})
                  </TabsTrigger>
                  <TabsTrigger value="overdue" className="font-paragraph">
                    Overdue ({categorized.overdue.length})
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="font-paragraph">
                    Upcoming ({categorized.upcoming.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="font-paragraph">
                    Completed ({categorized.completed.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="mt-6">
                  <FollowupList items={categorized.today} />
                </TabsContent>

                <TabsContent value="overdue" className="mt-6">
                  <FollowupList items={categorized.overdue} />
                </TabsContent>

                <TabsContent value="upcoming" className="mt-6">
                  <FollowupList items={categorized.upcoming} />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <FollowupList items={categorized.completed} />
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
