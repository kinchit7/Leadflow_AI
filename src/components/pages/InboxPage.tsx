import { useEffect, useState } from 'react';
import { BaseCrudService } from '@/integrations';
import { Conversations, Customers } from '@/entities';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Send, Paperclip, User, Mail, Phone, MapPin, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversations[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const result = await BaseCrudService.getAll<Conversations>('conversations');
      setConversations(result.items);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-secondary text-secondary-foreground';
      case 'pending':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'closed':
        return 'bg-muted-grey text-muted-grey-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
    }
  };

  const CustomerContextPanel = ({ conversation }: { conversation: Conversations }) => (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-xl text-foreground mb-4">Customer Information</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-muted-grey" />
            <span className="font-paragraph text-foreground">{conversation.customerName || 'Unknown'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-grey" />
            <span className="font-paragraph text-muted-grey-foreground">customer@example.com</span>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-muted-grey" />
            <span className="font-paragraph text-muted-grey-foreground">+91 98765 43210</span>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="h-4 w-4 text-muted-grey" />
            <span className="font-paragraph text-muted-grey-foreground">Bhopal, MP</span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h4 className="font-heading text-lg text-foreground mb-3">Recent Activity</h4>
        <p className="font-paragraph text-sm text-muted-grey-foreground">
          No recent activity
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-6">
            <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Inbox</h1>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Manage all customer conversations
            </p>
          </div>

          <div style={{ minHeight: '600px' }}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Conversation List */}
              <div className="lg:col-span-4">
                <Card className="bg-white border border-gray-200 h-[calc(100vh-280px)]">
                  <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-grey" />
                      <Input
                        type="search"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-gray-200"
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto h-[calc(100%-73px)]">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <LoadingSpinner />
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <Mail className="h-12 w-12 text-muted-grey mb-4" />
                        <p className="font-paragraph text-muted-grey-foreground">
                          {searchQuery ? 'No conversations found' : 'No conversations yet'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredConversations.map((conv) => (
                          <motion.button
                            key={conv._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setSelectedConversation(conv)}
                            className={`w-full text-left p-4 hover:bg-background transition-colors ${
                              selectedConversation?._id === conv._id ? 'bg-background' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-paragraph font-semibold text-foreground">
                                {conv.customerName || 'Unknown Customer'}
                              </h3>
                              {conv.unreadMessages && conv.unreadMessages > 0 && (
                                <Badge className="bg-primary text-primary-foreground">
                                  {conv.unreadMessages}
                                </Badge>
                              )}
                            </div>
                            <p className="font-paragraph text-sm text-foreground mb-2 line-clamp-1">
                              {conv.subject || 'No subject'}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge className={getStatusColor(conv.status)}>
                                {conv.status || 'Open'}
                              </Badge>
                              <span className="font-paragraph text-xs text-muted-grey-foreground">
                                {conv.channel || 'Email'}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Conversation Panel */}
              <div className="lg:col-span-5">
                <Card className="bg-white border border-gray-200 h-[calc(100vh-280px)] flex flex-col">
                  {selectedConversation ? (
                    <>
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="font-heading text-2xl text-foreground mb-1">
                              {selectedConversation.subject || 'No subject'}
                            </h2>
                            <p className="font-paragraph text-sm text-muted-grey-foreground">
                              {selectedConversation.customerName}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setSelectedConversation(null)}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <Mail className="h-12 w-12 text-muted-grey mb-4" />
                          <p className="font-paragraph text-muted-grey-foreground">
                            No messages yet
                          </p>
                        </div>
                      </div>

                      <div className="p-4 border-t border-gray-200">
                        <div className="flex items-end space-x-2">
                          <Button variant="ghost" size="icon">
                            <Paperclip className="h-5 w-5" />
                          </Button>
                          <Input
                            placeholder="Type your message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="flex-1 border-gray-200"
                          />
                          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Send className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <Mail className="h-16 w-16 text-muted-grey mb-4" />
                      <p className="font-paragraph text-lg text-muted-grey-foreground">
                        Select a conversation to view details
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Customer Context - Desktop */}
              <div className="hidden lg:block lg:col-span-3">
                <Card className="bg-white border border-gray-200 h-[calc(100vh-280px)] overflow-y-auto">
                  {selectedConversation ? (
                    <div className="p-4">
                      <CustomerContextPanel conversation={selectedConversation} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full p-6 text-center">
                      <p className="font-paragraph text-muted-grey-foreground">
                        Select a conversation to view customer details
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Customer Context - Mobile Drawer */}
              {selectedConversation && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden fixed bottom-6 right-6 rounded-full shadow-lg"
                    >
                      <User className="h-5 w-5 mr-2" />
                      Customer Info
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 bg-white">
                    <SheetHeader>
                      <SheetTitle className="font-heading text-2xl">Customer Details</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <CustomerContextPanel conversation={selectedConversation} />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
