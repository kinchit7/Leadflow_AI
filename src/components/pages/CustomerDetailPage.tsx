import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BaseCrudService } from '@/integrations';
import { Customers } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Image } from '@/components/ui/image';
import { ArrowLeft, Mail, Phone, MapPin, FileText } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    setIsLoading(true);
    try {
      const data = await BaseCrudService.getById<Customers>('customers', id!);
      setCustomer(data);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setIsLoading(false);
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

          <div style={{ minHeight: '500px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !customer ? (
              <div className="text-center py-12">
                <p className="font-paragraph text-muted-grey-foreground">Customer not found</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                      {customer.profilePicture && (
                        <Image
                          src={customer.profilePicture}
                          alt={customer.fullName || 'Customer'}
                          width={96}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <CardTitle className="font-heading text-3xl text-foreground mb-4">
                          {customer.fullName || 'Unknown Customer'}
                        </CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {customer.email && (
                            <div className="flex items-center space-x-3">
                              <Mail className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer.email}</span>
                            </div>
                          )}
                          {customer.phoneNumber && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer.phoneNumber}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer.address}</span>
                            </div>
                          )}
                          {customer.city && (
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-muted-grey" />
                              <span className="font-paragraph text-foreground">{customer.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {customer.notes && (
                    <CardContent className="border-t border-gray-200">
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-muted-grey mt-1" />
                        <div>
                          <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                            Notes
                          </p>
                          <p className="font-paragraph text-foreground whitespace-pre-wrap">
                            {customer.notes}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="bg-white border border-gray-200">
                    <TabsTrigger value="overview" className="font-paragraph">Overview</TabsTrigger>
                    <TabsTrigger value="conversations" className="font-paragraph">Conversations</TabsTrigger>
                    <TabsTrigger value="leads" className="font-paragraph">Leads</TabsTrigger>
                    <TabsTrigger value="opportunities" className="font-paragraph">Opportunities</TabsTrigger>
                    <TabsTrigger value="followups" className="font-paragraph">Follow-ups</TabsTrigger>
                    <TabsTrigger value="support" className="font-paragraph">Support</TabsTrigger>
                    <TabsTrigger value="activity" className="font-paragraph">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          Customer overview coming soon
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="conversations" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          No conversations yet
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="leads" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          No leads yet
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="opportunities" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          No opportunities yet
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="followups" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          No follow-ups yet
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="support" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          No support tickets yet
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-6">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                          No activity yet
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
