import { useEffect, useState } from 'react';
import { BaseCrudService } from '@/integrations';
import { Subscriptions, Wallets, WalletTransactions } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Wallet, CreditCard, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscriptions | null>(null);
  const [wallet, setWallet] = useState<Wallets | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactions[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subscriptionsData, walletsData, transactionsData] = await Promise.all([
        BaseCrudService.getAll<Subscriptions>('subscriptions'),
        BaseCrudService.getAll<Wallets>('wallets'),
        BaseCrudService.getAll<WalletTransactions>('wallettransactions'),
      ]);
      if (subscriptionsData.items.length > 0) {
        setSubscription(subscriptionsData.items[0]);
      }
      if (walletsData.items.length > 0) {
        setWallet(walletsData.items[0]);
      }
      setTransactions(transactionsData.items);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-secondary text-secondary-foreground';
      case 'trial':
        return 'bg-accent-gold text-accent-gold-foreground';
      case 'expired':
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
              <Wallet className="h-10 w-10 text-primary" />
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground">Billing & Wallet</h1>
            </div>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Manage your subscription and wallet balance
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subscription */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl flex items-center">
                      <CreditCard className="h-6 w-6 mr-3 text-primary" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscription ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-3xl text-foreground">
                            {subscription.planName || 'Free Trial'}
                          </span>
                          <Badge className={getStatusColor(subscription.status)}>
                            {subscription.status || 'Trial'}
                          </Badge>
                        </div>
                        {subscription.isTrialActive && subscription.trialEndDate && (
                          <div className="flex items-center space-x-2 text-accent-gold">
                            <Calendar className="h-4 w-4" />
                            <span className="font-paragraph text-sm">
                              Trial ends on{' '}
                              {new Date(subscription.trialEndDate).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-paragraph text-muted-grey-foreground">
                              Leads Used
                            </span>
                            <span className="font-paragraph text-foreground font-semibold">
                              {subscription.leadsUsed || 0} / {subscription.maxLeadsAllowed || 0}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${
                                  subscription.maxLeadsAllowed
                                    ? ((subscription.leadsUsed || 0) /
                                        subscription.maxLeadsAllowed) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4">
                          Upgrade Plan
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="font-paragraph text-muted-grey-foreground mb-4">
                          No active subscription
                        </p>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                          Start Free Trial
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Wallet */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl flex items-center">
                      <Wallet className="h-6 w-6 mr-3 text-primary" />
                      Wallet Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {wallet ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-4xl text-foreground">
                            ₹{wallet.currentBalance?.toLocaleString('en-IN') || '0'}
                          </span>
                          <Badge className="bg-secondary text-secondary-foreground">
                            {wallet.currencyCode || 'INR'}
                          </Badge>
                        </div>
                        {wallet.lastActivityDate && (
                          <p className="font-paragraph text-sm text-muted-grey-foreground">
                            Last activity:{' '}
                            {new Date(wallet.lastActivityDate).toLocaleDateString('en-IN')}
                          </p>
                        )}
                        <div className="flex space-x-3 pt-4">
                          <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                            Add Funds
                          </Button>
                          <Button variant="outline" className="flex-1">
                            Withdraw
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="font-paragraph text-muted-grey-foreground mb-4">
                          No wallet configured
                        </p>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                          Create Wallet
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Transactions */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl flex items-center">
                    <TrendingUp className="h-6 w-6 mr-3 text-primary" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                      No transactions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction._id}
                          className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-paragraph text-foreground font-semibold">
                                {transaction.description || 'Transaction'}
                              </p>
                              <p className="font-paragraph text-xs text-muted-grey-foreground">
                                {transaction.timestamp
                                  ? new Date(transaction.timestamp).toLocaleDateString('en-IN')
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-paragraph font-semibold ${
                                transaction.transactionType === 'credit'
                                  ? 'text-secondary'
                                  : 'text-foreground'
                              }`}
                            >
                              {transaction.transactionType === 'credit' ? '+' : '-'}₹
                              {transaction.amount?.toLocaleString('en-IN') || '0'}
                            </p>
                            <Badge
                              variant="outline"
                              className="font-paragraph text-xs"
                            >
                              {transaction.status || 'Completed'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
