import { useMember } from '@/integrations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Calendar, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { member } = useMember();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-8">
            <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">
              Profile
            </h1>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Manage your account information
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl text-foreground">
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <User className="h-5 w-5 text-muted-grey mt-1" />
                    <div className="flex-1">
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                        Display Name
                      </p>
                      <p className="font-paragraph text-foreground">
                        {member?.profile?.nickname || 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <User className="h-5 w-5 text-muted-grey mt-1" />
                    <div className="flex-1">
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                        Full Name
                      </p>
                      <p className="font-paragraph text-foreground">
                        {member?.contact?.firstName && member?.contact?.lastName
                          ? `${member.contact.firstName} ${member.contact.lastName}`
                          : 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <Mail className="h-5 w-5 text-muted-grey mt-1" />
                    <div className="flex-1">
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                        Email
                      </p>
                      <p className="font-paragraph text-foreground">
                        {member?.loginEmail || 'Not set'}
                      </p>
                      {member?.loginEmailVerified && (
                        <p className="font-paragraph text-xs text-secondary mt-1">
                          Verified
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <Calendar className="h-5 w-5 text-muted-grey mt-1" />
                    <div className="flex-1">
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                        Member Since
                      </p>
                      <p className="font-paragraph text-foreground">
                        {member?._createdDate
                          ? new Date(member._createdDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Not available'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <Shield className="h-5 w-5 text-muted-grey mt-1" />
                    <div className="flex-1">
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-1">
                        Account Status
                      </p>
                      <p className="font-paragraph text-foreground">
                        {member?.status || 'Active'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl text-foreground">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.location.href = '/settings'}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.location.href = '/settings?tab=security'}
                  >
                    Security Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
