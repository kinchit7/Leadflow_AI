import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Customers } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Image } from '@/components/ui/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Eye, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBackendService } from '@/hooks/useBackendService';
import { getCustomersForBusiness, createCustomerAuthorized, updateCustomerAuthorized, deleteCustomerAuthorized } from '@/backend/customers-service.web';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { executeWithAuth, error, clearError } = useBackendService();
  const [customers, setCustomers] = useState<Customers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customers | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadCustomers = async () => {
    setIsLoading(true);
    clearError();
    const result = await executeWithAuth(async (auth) => {
      return await getCustomersForBusiness(auth, 100, 0);
    });
    if (result) {
      setCustomers(result.items);
    }
    setIsLoading(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await executeWithAuth(async (auth) => {
      await createCustomerAuthorized(
        {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          notes: formData.notes,
          businessId: auth.businessId,
          isDemo: false,
        },
        auth
      );
      return true;
    });
    if (success) {
      setIsCreateDialogOpen(false);
      resetForm();
      loadCustomers();
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    clearError();
    const success = await executeWithAuth(async (auth) => {
      await updateCustomerAuthorized(
        selectedCustomer._id,
        {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          notes: formData.notes,
        },
        auth
      );
      return true;
    });
    if (success) {
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedCustomer(null);
      loadCustomers();
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    clearError();
    const success = await executeWithAuth(async (auth) => {
      return await deleteCustomerAuthorized(customerId, auth);
    });
    if (success) {
      loadCustomers();
    }
  };

  const openEditDialog = (customer: Customers) => {
    setSelectedCustomer(customer);
    setFormData({
      fullName: customer.fullName || '',
      email: customer.email || '',
      phoneNumber: customer.phoneNumber || '',
      address: customer.address || '',
      city: customer.city || '',
      notes: customer.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      notes: '',
    });
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
            <div>
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Customers</h1>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Manage your customer relationships
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5 mr-2" />
                  New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">Create New Customer</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCustomer} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City, State"
                    />
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
                      Create Customer
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
              <p className="font-paragraph">{error.message}</p>
            </div>
          )}

          <div style={{ minHeight: '500px' }}>
            <Card className="bg-white border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-grey" />
                  <Input
                    type="search"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-200"
                  />
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-grey mb-4" />
                    <p className="font-paragraph text-muted-grey-foreground">
                      {searchQuery ? 'No customers found' : 'No customers yet. Create your first customer to get started.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map((customer) => (
                      <motion.div
                        key={customer._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="bg-white border border-gray-200 hover:border-primary/50 transition-colors">
                          <div className="p-6">
                            <div className="flex items-start space-x-4">
                              {customer.profilePicture && (
                                <Image
                                  src={customer.profilePicture}
                                  alt={customer.fullName || 'Customer'}
                                  width={64}
                                  className="w-16 h-16 rounded-full object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-heading text-xl text-foreground mb-1 truncate">
                                  {customer.fullName || 'Unknown'}
                                </h3>
                                {customer.email && (
                                  <p className="font-paragraph text-sm text-muted-grey-foreground mb-1 truncate">
                                    {customer.email}
                                  </p>
                                )}
                                {customer.phoneNumber && (
                                  <p className="font-paragraph text-sm text-muted-grey-foreground truncate">
                                    {customer.phoneNumber}
                                  </p>
                                )}
                                {customer.city && (
                                  <p className="font-paragraph text-sm text-muted-grey-foreground mt-2">
                                    {customer.city}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => navigate(`/customers/${customer._id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
