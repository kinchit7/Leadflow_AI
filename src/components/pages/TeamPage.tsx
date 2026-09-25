import { useEffect, useState } from 'react';
import { BaseCrudService } from '@/integrations';
import { Users as UsersType, Roles } from '@/entities';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Image } from '@/components/ui/image';
import { Users, Shield, Plus } from 'lucide-react';

export default function TeamPage() {
  const [users, setUsers] = useState<UsersType[]>([]);
  const [roles, setRoles] = useState<Roles[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        BaseCrudService.getAll<UsersType>('users'),
        BaseCrudService.getAll<Roles>('roles'),
      ]);
      setUsers(usersData.items);
      setRoles(rolesData.items);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
            <div>
              <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-2">Team</h1>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Manage your team members and roles
              </p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-5 w-5 mr-2" />
              Invite Team Member
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Team Members */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl flex items-center">
                    <Users className="h-6 w-6 mr-3 text-primary" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <p className="font-paragraph text-muted-grey-foreground text-center py-8">
                      No team members yet. Invite your team to collaborate.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {users.map((user) => (
                        <Card key={user._id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-4">
                              {user.profilePicture && (
                                <Image
                                  src={user.profilePicture}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  width={48}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-heading text-lg text-foreground mb-1">
                                  {user.firstName} {user.lastName}
                                </h3>
                                <p className="font-paragraph text-sm text-muted-grey-foreground mb-2 truncate">
                                  {user.email}
                                </p>
                                <Badge
                                  className={
                                    user.isActive
                                      ? 'bg-secondary text-secondary-foreground'
                                      : 'bg-muted-grey text-muted-grey-foreground'
                                  }
                                >
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Roles */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl flex items-center">
                    <Shield className="h-6 w-6 mr-3 text-primary" />
                    Roles & Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roles.length === 0 ? (
                    <div className="space-y-4">
                      <p className="font-paragraph text-muted-grey-foreground mb-6">
                        Define roles to control what team members can access and do.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Owner', 'Manager', 'Sales', 'Support'].map((role) => (
                          <Card key={role} className="border border-gray-200">
                            <CardContent className="p-4">
                              <h3 className="font-heading text-lg text-foreground mb-2">{role}</h3>
                              <p className="font-paragraph text-sm text-muted-grey-foreground">
                                {role === 'Owner' && 'Full access to all features and settings'}
                                {role === 'Manager' && 'Manage team, leads, and customer support'}
                                {role === 'Sales' && 'Access to leads, customers, and opportunities'}
                                {role === 'Support' && 'Access to support tickets and customer conversations'}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roles.map((role) => (
                        <Card key={role._id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <h3 className="font-heading text-lg text-foreground mb-2">
                              {role.roleName}
                            </h3>
                            <p className="font-paragraph text-sm text-muted-grey-foreground mb-3">
                              {role.description}
                            </p>
                            <div className="space-y-1">
                              {role.canManageUsers && (
                                <p className="font-paragraph text-xs text-foreground">✓ Manage Users</p>
                              )}
                              {role.canViewAnalytics && (
                                <p className="font-paragraph text-xs text-foreground">✓ View Analytics</p>
                              )}
                              {role.canCreateLeads && (
                                <p className="font-paragraph text-xs text-foreground">✓ Create Leads</p>
                              )}
                              {role.canManageSupportTickets && (
                                <p className="font-paragraph text-xs text-foreground">✓ Manage Support</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
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
