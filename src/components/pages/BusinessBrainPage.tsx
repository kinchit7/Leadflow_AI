import { useEffect, useState } from 'react';
import { BaseCrudService } from '@/integrations';
import { Products, Services, FrequentlyAskedQuestions, BusinessPolicies, KnowledgeItems } from '@/entities';
import { useMember } from '@/integrations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Package, Briefcase, HelpCircle, FileText, Clock, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function BusinessBrainPage() {
  const { member } = useMember();
  const [products, setProducts] = useState<Products[]>([]);
  const [services, setServices] = useState<Services[]>([]);
  const [faqs, setFaqs] = useState<FrequentlyAskedQuestions[]>([]);
  const [policies, setPolicies] = useState<BusinessPolicies[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [productDialog, setProductDialog] = useState(false);
  const [serviceDialog, setServiceDialog] = useState(false);
  const [faqDialog, setFaqDialog] = useState(false);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [hoursDialog, setHoursDialog] = useState(false);

  // Form states
  const [editingProduct, setEditingProduct] = useState<Products | null>(null);
  const [editingService, setEditingService] = useState<Services | null>(null);
  const [editingFaq, setEditingFaq] = useState<FrequentlyAskedQuestions | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<BusinessPolicies | null>(null);

  const [productForm, setProductForm] = useState({ itemName: '', itemPrice: 0, itemDescription: '', productCategory: '' });
  const [serviceForm, setServiceForm] = useState({ itemName: '', itemPrice: 0, itemDescription: '', serviceDuration: '' });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '' });
  const [policyForm, setPolicyForm] = useState({ policyTitle: '', policyContent: '', policyCategory: '' });

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

  // Product handlers
  const handleAddProduct = async () => {
    if (!productForm.itemName || productForm.itemPrice <= 0) return;
    try {
      await BaseCrudService.create('products', {
        ...productForm,
        _id: crypto.randomUUID(),
        isAvailable: true,
      });
      setProductForm({ itemName: '', itemPrice: 0, itemDescription: '', productCategory: '' });
      setProductDialog(false);
      loadData();
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productForm.itemName) return;
    try {
      await BaseCrudService.update('products', {
        _id: editingProduct._id,
        ...productForm,
      });
      setEditingProduct(null);
      setProductForm({ itemName: '', itemPrice: 0, itemDescription: '', productCategory: '' });
      setProductDialog(false);
      loadData();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await BaseCrudService.delete('products', id);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Service handlers
  const handleAddService = async () => {
    if (!serviceForm.itemName || serviceForm.itemPrice <= 0) return;
    try {
      await BaseCrudService.create('services', {
        ...serviceForm,
        _id: crypto.randomUUID(),
      });
      setServiceForm({ itemName: '', itemPrice: 0, itemDescription: '', serviceDuration: '' });
      setServiceDialog(false);
      loadData();
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService || !serviceForm.itemName) return;
    try {
      await BaseCrudService.update('services', {
        _id: editingService._id,
        ...serviceForm,
      });
      setEditingService(null);
      setServiceForm({ itemName: '', itemPrice: 0, itemDescription: '', serviceDuration: '' });
      setServiceDialog(false);
      loadData();
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await BaseCrudService.delete('services', id);
      loadData();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  // FAQ handlers
  const handleAddFAQ = async () => {
    if (!faqForm.question || !faqForm.answer) return;
    try {
      await BaseCrudService.create('faqs', {
        ...faqForm,
        _id: crypto.randomUUID(),
        isPublished: true,
      });
      setFaqForm({ question: '', answer: '', category: '' });
      setFaqDialog(false);
      loadData();
    } catch (error) {
      console.error('Error creating FAQ:', error);
    }
  };

  const handleUpdateFAQ = async () => {
    if (!editingFaq || !faqForm.question) return;
    try {
      await BaseCrudService.update('faqs', {
        _id: editingFaq._id,
        ...faqForm,
        lastUpdated: new Date(),
      });
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '', category: '' });
      setFaqDialog(false);
      loadData();
    } catch (error) {
      console.error('Error updating FAQ:', error);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    try {
      await BaseCrudService.delete('faqs', id);
      loadData();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
    }
  };

  // Policy handlers
  const handleAddPolicy = async () => {
    if (!policyForm.policyTitle || !policyForm.policyContent) return;
    try {
      await BaseCrudService.create('policies', {
        ...policyForm,
        _id: crypto.randomUUID(),
        isActive: true,
      });
      setPolicyForm({ policyTitle: '', policyContent: '', policyCategory: '' });
      setPolicyDialog(false);
      loadData();
    } catch (error) {
      console.error('Error creating policy:', error);
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy || !policyForm.policyTitle) return;
    try {
      await BaseCrudService.update('policies', {
        _id: editingPolicy._id,
        ...policyForm,
        lastUpdated: new Date(),
      });
      setEditingPolicy(null);
      setPolicyForm({ policyTitle: '', policyContent: '', policyCategory: '' });
      setPolicyDialog(false);
      loadData();
    } catch (error) {
      console.error('Error updating policy:', error);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      await BaseCrudService.delete('policies', id);
      loadData();
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  };

  const openProductDialog = (product?: Products) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        itemName: product.itemName || '',
        itemPrice: product.itemPrice || 0,
        itemDescription: product.itemDescription || '',
        productCategory: product.productCategory || '',
      });
    } else {
      setEditingProduct(null);
      setProductForm({ itemName: '', itemPrice: 0, itemDescription: '', productCategory: '' });
    }
    setProductDialog(true);
  };

  const openServiceDialog = (service?: Services) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        itemName: service.itemName || '',
        itemPrice: service.itemPrice || 0,
        itemDescription: service.itemDescription || '',
        serviceDuration: service.serviceDuration || '',
      });
    } else {
      setEditingService(null);
      setServiceForm({ itemName: '', itemPrice: 0, itemDescription: '', serviceDuration: '' });
    }
    setServiceDialog(true);
  };

  const openFaqDialog = (faq?: FrequentlyAskedQuestions) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({
        question: faq.question || '',
        answer: faq.answer || '',
        category: faq.category || '',
      });
    } else {
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '', category: '' });
    }
    setFaqDialog(true);
  };

  const openPolicyDialog = (policy?: BusinessPolicies) => {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyForm({
        policyTitle: policy.policyTitle || '',
        policyContent: policy.policyContent || '',
        policyCategory: policy.policyCategory || '',
      });
    } else {
      setEditingPolicy(null);
      setPolicyForm({ policyTitle: '', policyContent: '', policyCategory: '' });
    }
    setPolicyDialog(true);
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

              {/* Products Tab */}
              <TabsContent value="products" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Products</CardTitle>
                      <Dialog open={productDialog} onOpenChange={setProductDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openProductDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-heading">
                              {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="font-paragraph text-sm">Product Name</Label>
                              <Input
                                value={productForm.itemName}
                                onChange={(e) => setProductForm({ ...productForm, itemName: e.target.value })}
                                placeholder="Enter product name"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Price</Label>
                              <Input
                                type="number"
                                value={productForm.itemPrice}
                                onChange={(e) => setProductForm({ ...productForm, itemPrice: parseFloat(e.target.value) })}
                                placeholder="Enter price"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Category</Label>
                              <Input
                                value={productForm.productCategory}
                                onChange={(e) => setProductForm({ ...productForm, productCategory: e.target.value })}
                                placeholder="Enter category"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Description</Label>
                              <Textarea
                                value={productForm.itemDescription}
                                onChange={(e) => setProductForm({ ...productForm, itemDescription: e.target.value })}
                                placeholder="Enter product description"
                                className="font-paragraph"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setProductDialog(false)} className="font-paragraph">
                                Cancel
                              </Button>
                              <Button
                                onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-paragraph"
                              >
                                {editingProduct ? 'Update' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-heading text-lg text-foreground flex-1">
                                  {product.itemName}
                                </h3>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openProductDialog(product)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Edit2 className="h-4 w-4 text-muted-grey" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product._id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </button>
                                </div>
                              </div>
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

              {/* Services Tab */}
              <TabsContent value="services" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Services</CardTitle>
                      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openServiceDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-heading">
                              {editingService ? 'Edit Service' : 'Add New Service'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="font-paragraph text-sm">Service Name</Label>
                              <Input
                                value={serviceForm.itemName}
                                onChange={(e) => setServiceForm({ ...serviceForm, itemName: e.target.value })}
                                placeholder="Enter service name"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Price</Label>
                              <Input
                                type="number"
                                value={serviceForm.itemPrice}
                                onChange={(e) => setServiceForm({ ...serviceForm, itemPrice: parseFloat(e.target.value) })}
                                placeholder="Enter price"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Duration</Label>
                              <Input
                                value={serviceForm.serviceDuration}
                                onChange={(e) => setServiceForm({ ...serviceForm, serviceDuration: e.target.value })}
                                placeholder="e.g., 1 hour, 30 minutes"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Description</Label>
                              <Textarea
                                value={serviceForm.itemDescription}
                                onChange={(e) => setServiceForm({ ...serviceForm, itemDescription: e.target.value })}
                                placeholder="Enter service description"
                                className="font-paragraph"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setServiceDialog(false)} className="font-paragraph">
                                Cancel
                              </Button>
                              <Button
                                onClick={editingService ? handleUpdateService : handleAddService}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-paragraph"
                              >
                                {editingService ? 'Update' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-heading text-lg text-foreground flex-1">
                                  {service.itemName}
                                </h3>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openServiceDialog(service)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Edit2 className="h-4 w-4 text-muted-grey" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteService(service._id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </button>
                                </div>
                              </div>
                              <p className="font-paragraph text-sm text-muted-grey-foreground mb-2">
                                {service.itemDescription}
                              </p>
                              <p className="font-paragraph text-lg text-foreground font-semibold">
                                ₹{service.itemPrice?.toLocaleString('en-IN')}
                              </p>
                              {service.serviceDuration && (
                                <p className="font-paragraph text-xs text-muted-grey mt-2">
                                  Duration: {service.serviceDuration}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FAQs Tab */}
              <TabsContent value="faqs" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Frequently Asked Questions</CardTitle>
                      <Dialog open={faqDialog} onOpenChange={setFaqDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openFaqDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" />
                            Add FAQ
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-heading">
                              {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="font-paragraph text-sm">Question</Label>
                              <Input
                                value={faqForm.question}
                                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                                placeholder="Enter question"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Category</Label>
                              <Input
                                value={faqForm.category}
                                onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                                placeholder="e.g., Billing, Support, General"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Answer</Label>
                              <Textarea
                                value={faqForm.answer}
                                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                                placeholder="Enter answer"
                                className="font-paragraph"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setFaqDialog(false)} className="font-paragraph">
                                Cancel
                              </Button>
                              <Button
                                onClick={editingFaq ? handleUpdateFAQ : handleAddFAQ}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-paragraph"
                              >
                                {editingFaq ? 'Update' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-heading text-lg text-foreground flex-1">
                                  {faq.question}
                                </h3>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openFaqDialog(faq)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Edit2 className="h-4 w-4 text-muted-grey" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFAQ(faq._id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </button>
                                </div>
                              </div>
                              {faq.category && (
                                <p className="font-paragraph text-xs text-muted-grey mb-2">
                                  Category: {faq.category}
                                </p>
                              )}
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

              {/* Policies Tab */}
              <TabsContent value="policies" className="mt-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-2xl">Business Policies</CardTitle>
                      <Dialog open={policyDialog} onOpenChange={setPolicyDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openPolicyDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Policy
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-heading">
                              {editingPolicy ? 'Edit Policy' : 'Add New Policy'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="font-paragraph text-sm">Policy Title</Label>
                              <Input
                                value={policyForm.policyTitle}
                                onChange={(e) => setPolicyForm({ ...policyForm, policyTitle: e.target.value })}
                                placeholder="Enter policy title"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Category</Label>
                              <Input
                                value={policyForm.policyCategory}
                                onChange={(e) => setPolicyForm({ ...policyForm, policyCategory: e.target.value })}
                                placeholder="e.g., Refund, Privacy, Terms"
                                className="font-paragraph"
                              />
                            </div>
                            <div>
                              <Label className="font-paragraph text-sm">Policy Content</Label>
                              <Textarea
                                value={policyForm.policyContent}
                                onChange={(e) => setPolicyForm({ ...policyForm, policyContent: e.target.value })}
                                placeholder="Enter policy content"
                                className="font-paragraph"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setPolicyDialog(false)} className="font-paragraph">
                                Cancel
                              </Button>
                              <Button
                                onClick={editingPolicy ? handleUpdatePolicy : handleAddPolicy}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-paragraph"
                              >
                                {editingPolicy ? 'Update' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-heading text-lg text-foreground flex-1">
                                  {policy.policyTitle}
                                </h3>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openPolicyDialog(policy)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Edit2 className="h-4 w-4 text-muted-grey" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePolicy(policy._id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </button>
                                </div>
                              </div>
                              {policy.policyCategory && (
                                <p className="font-paragraph text-xs text-muted-grey mb-2">
                                  Category: {policy.policyCategory}
                                </p>
                              )}
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

              {/* Business Hours Tab */}
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
