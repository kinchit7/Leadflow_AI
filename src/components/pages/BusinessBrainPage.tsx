import { useEffect, useState } from 'react';
import { BaseCrudService } from '@/integrations';
import { Products, Services, FrequentlyAskedQuestions, BusinessPolicies, KnowledgeItems } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brain, Package, Briefcase, HelpCircle, FileText, Clock } from 'lucide-react';

export default function BusinessBrainPage() {
  const [products, setProducts] = useState<Products[]>([]);
  const [services, setServices] = useState<Services[]>([]);
  const [faqs, setFaqs] = useState<FrequentlyAskedQuestions[]>([]);
  const [policies, setPolicies] = useState<BusinessPolicies[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, servicesData, faqsData, policiesData, knowledgeData] = await Promise.all([
        BaseCrudService.getAll<Products>('products'),
        BaseCrudService.getAll<Services>('services'),
        BaseCrudService.getAll<FrequentlyAskedQuestions>('faqs'),
        BaseCrudService.getAll<BusinessPolicies>('policies'),
        BaseCrudService.getAll<KnowledgeItems>('knowledgeitems'),
      ]);
      setProducts(productsData.items);
      setServices(servicesData.items);
      setFaqs(faqsData.items);
      setPolicies(policiesData.items);
      setKnowledgeItems(knowledgeData.items);
    } catch (error) {
      console.error('Error loading business brain data:', error);
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
            <div className="flex items-center space-x-3 mb-2">
              <Brain className="h-10 w-10 text-primary" />
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground">Business Brain</h1>
            </div>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Your business knowledge base that powers LeadFlow AI
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger value="products" className="font-paragraph">
                  <Package className="h-4 w-4 mr-2" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="services" className="font-paragraph">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="faqs" className="font-paragraph">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  FAQs
                </TabsTrigger>
                <TabsTrigger value="policies" className="font-paragraph">
                  <FileText className="h-4 w-4 mr-2" />
                  Policies
                </TabsTrigger>
                <TabsTrigger value="hours" className="font-paragraph">
                  <Clock className="h-4 w-4 mr-2" />
                  Business Hours
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Products</CardTitle>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Add Product
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                        No products added yet. Add your products to help LeadFlow AI understand your offerings.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => (
                          <Card key={product._id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <h3 className="font-heading text-lg text-foreground mb-2">
                                {product.itemName}
                              </h3>
                              <p className="font-paragraph text-sm text-muted-grey-foreground mb-2">
                                {product.itemDescription}
                              </p>
                              <p className="font-paragraph text-lg text-foreground font-semibold">
                                ₹{product.itemPrice?.toLocaleString('en-IN')}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Services</CardTitle>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Add Service
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {services.length === 0 ? (
                      <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                        No services added yet. Add your services to help LeadFlow AI understand your offerings.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map((service) => (
                          <Card key={service._id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <h3 className="font-heading text-lg text-foreground mb-2">
                                {service.itemName}
                              </h3>
                              <p className="font-paragraph text-sm text-muted-grey-foreground mb-2">
                                {service.itemDescription}
                              </p>
                              <p className="font-paragraph text-lg text-foreground font-semibold">
                                ₹{service.itemPrice?.toLocaleString('en-IN')}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faqs" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Frequently Asked Questions</CardTitle>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Add FAQ
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {faqs.length === 0 ? (
                      <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                        No FAQs added yet. Add common questions to help LeadFlow AI assist customers better.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {faqs.map((faq) => (
                          <Card key={faq._id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <h3 className="font-heading text-lg text-foreground mb-2">
                                {faq.question}
                              </h3>
                              <p className="font-paragraph text-muted-grey-foreground">
                                {faq.answer}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policies" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Business Policies</CardTitle>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Add Policy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {policies.length === 0 ? (
                      <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                        No policies added yet. Add your business policies to help LeadFlow AI provide accurate information.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {policies.map((policy) => (
                          <Card key={policy._id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <h3 className="font-heading text-lg text-foreground mb-2">
                                {policy.policyTitle}
                              </h3>
                              <p className="font-paragraph text-muted-grey-foreground">
                                {policy.policyContent}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hours" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Business Hours</CardTitle>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Update Hours
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {knowledgeItems.length === 0 ? (
                      <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                        No business hours configured yet. Set your operating hours to help customers know when you're available.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {knowledgeItems.map((item) => (
                          <div key={item._id} className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="font-paragraph text-foreground font-semibold">
                              {item.appliesToDay}
                            </span>
                            <span className="font-paragraph text-muted-grey-foreground">
                              {item.openingTime} - {item.closingTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
