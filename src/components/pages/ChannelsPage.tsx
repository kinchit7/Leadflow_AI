import { useEffect, useState } from 'react';
import { BaseCrudService } from '@/integrations';
import { Channels } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MessageCircle, Instagram, Facebook, Globe, Mail, Phone, Radio } from 'lucide-react';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channels[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      const result = await BaseCrudService.getAll<Channels>('channels');
      setChannels(result.items);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultChannels = [
    {
      name: 'WhatsApp',
      type: 'whatsapp',
      icon: MessageCircle,
      description: 'Connect your WhatsApp Business account',
      status: 'Not Connected',
    },
    {
      name: 'Instagram',
      type: 'instagram',
      icon: Instagram,
      description: 'Connect your Instagram Business account',
      status: 'Not Connected',
    },
    {
      name: 'Facebook',
      type: 'facebook',
      icon: Facebook,
      description: 'Connect your Facebook Page',
      status: 'Not Connected',
    },
    {
      name: 'Website',
      type: 'website',
      icon: Globe,
      description: 'Add chat widget to your website',
      status: 'Not Connected',
    },
    {
      name: 'Email',
      type: 'email',
      icon: Mail,
      description: 'Connect your email account',
      status: 'Not Connected',
    },
    {
      name: 'Phone',
      type: 'phone',
      icon: Phone,
      description: 'Configure phone integration',
      status: 'Not Connected',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return 'bg-secondary text-secondary-foreground';
      case 'not connected':
        return 'bg-muted-grey text-muted-grey-foreground';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted-grey text-muted-grey-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Radio className="h-10 w-10 text-primary" />
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground">Channels</h1>
            </div>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Connect your communication channels to manage all customer interactions in one place
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {defaultChannels.map((channel) => {
                const Icon = channel.icon;
                const dbChannel = channels.find((c) => c.channelType?.toLowerCase() === channel.type);
                const status = dbChannel?.connectionStatus || channel.status;

                return (
                  <Card key={channel.type} className="bg-white border border-gray-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="font-heading text-xl text-foreground">
                              {dbChannel?.displayName || channel.name}
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-4">
                        {channel.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(status)}>{status}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={status === 'Not Connected'}
                          className="border-primary text-primary hover:bg-primary/5"
                        >
                          {status === 'Not Connected' ? 'Coming Soon' : 'Configure'}
                        </Button>
                      </div>
                      {dbChannel?.lastUpdated && (
                        <p className="font-paragraph text-xs text-muted-grey-foreground mt-3">
                          Last updated: {new Date(dbChannel.lastUpdated).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="bg-white border border-gray-200 mt-8">
            <CardContent className="p-8 text-center">
              <h3 className="font-heading text-2xl text-foreground mb-3">
                Channel Integrations Coming Soon
              </h3>
              <p className="font-paragraph text-muted-grey-foreground max-w-2xl mx-auto">
                We're working on bringing you seamless integrations with all major communication channels.
                Stay tuned for updates as we roll out these features.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
