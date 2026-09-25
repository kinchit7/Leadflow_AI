import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMember } from '@/integrations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Settings, Building2, User, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const { member } = useMember();
  const defaultTab = searchParams.get('tab') || 'business';

  const [businessSettings, setBusinessSettings] = useState({
    businessName: 'My Business',
    industry: 'Retail',
    location: 'Bhopal, MP',
    timezone: 'Asia/Kolkata',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    leadNotifications: true,
    supportNotifications: true,
    followupReminders: true,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="h-10 w-10 text-primary" />
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground">Settings</h1>
            </div>
            <p className="font-paragraph text-lg text-muted-grey-foreground">
              Manage your account and application preferences
            </p>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="business" className="font-paragraph">
                <Building2 className="h-4 w-4 mr-2" />
                Business
              </TabsTrigger>
              <TabsTrigger value="profile" className="font-paragraph">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="font-paragraph">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="font-paragraph">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="mt-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Business Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessSettings.businessName}
                        onChange={(e) =>
                          setBusinessSettings({ ...businessSettings, businessName: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          value={businessSettings.industry}
                          onChange={(e) =>
                            setBusinessSettings({ ...businessSettings, industry: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={businessSettings.location}
                          onChange={(e) =>
                            setBusinessSettings({ ...businessSettings, location: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={businessSettings.timezone}
                        onChange={(e) =>
                          setBusinessSettings({ ...businessSettings, timezone: e.target.value })
                        }
                      />
                    </div>

                    <div className="pt-4">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Profile Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          defaultValue={member?.contact?.firstName || ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          defaultValue={member?.contact?.lastName || ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={member?.loginEmail || ''}
                        disabled
                      />
                      <p className="font-paragraph text-xs text-muted-grey-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        defaultValue={member?.profile?.nickname || ''}
                      />
                    </div>

                    <div className="pt-4">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-heading text-lg text-foreground mb-2">Password</h3>
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-4">
                        Change your password to keep your account secure
                      </p>
                      <Button variant="outline">Change Password</Button>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="font-heading text-lg text-foreground mb-2">
                        Two-Factor Authentication
                      </h3>
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-4">
                        Add an extra layer of security to your account
                      </p>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="font-heading text-lg text-foreground mb-2">Active Sessions</h3>
                      <p className="font-paragraph text-sm text-muted-grey-foreground mb-4">
                        Manage your active sessions across devices
                      </p>
                      <Button variant="outline">View Sessions</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-paragraph text-foreground font-semibold mb-1">
                          Email Notifications
                        </h3>
                        <p className="font-paragraph text-sm text-muted-grey-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-paragraph text-foreground font-semibold mb-1">
                          Push Notifications
                        </h3>
                        <p className="font-paragraph text-sm text-muted-grey-foreground">
                          Receive push notifications in your browser
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.pushNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="font-heading text-lg text-foreground mb-4">
                        Notification Types
                      </h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-paragraph text-foreground font-semibold mb-1">
                              New Leads
                            </h4>
                            <p className="font-paragraph text-sm text-muted-grey-foreground">
                              Get notified when new leads are created
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.leadNotifications}
                            onCheckedChange={(checked) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                leadNotifications: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-paragraph text-foreground font-semibold mb-1">
                              Support Tickets
                            </h4>
                            <p className="font-paragraph text-sm text-muted-grey-foreground">
                              Get notified about new support tickets
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.supportNotifications}
                            onCheckedChange={(checked) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                supportNotifications: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-paragraph text-foreground font-semibold mb-1">
                              Follow-up Reminders
                            </h4>
                            <p className="font-paragraph text-sm text-muted-grey-foreground">
                              Get reminded about upcoming follow-ups
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.followupReminders}
                            onCheckedChange={(checked) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                followupReminders: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
