import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMember } from '@/integrations';
import { BaseCrudService } from '@/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Building2, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { member } = useMember();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    location: '',
    branchName: '',
    teamSize: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create business
      const businessId = crypto.randomUUID();
      await BaseCrudService.create('businesses', {
        _id: businessId,
        businessName: formData.businessName,
        industry: formData.industry,
        location: formData.location,
        teamSize: parseInt(formData.teamSize) || 1,
      });

      // Create branch
      await BaseCrudService.create('branches', {
        _id: crypto.randomUUID(),
        branchName: formData.branchName || 'Main Branch',
        city: formData.location,
        isActive: true,
      });

      // Create user record
      await BaseCrudService.create('users', {
        _id: crypto.randomUUID(),
        firstName: member?.contact?.firstName || '',
        lastName: member?.contact?.lastName || '',
        email: member?.loginEmail || '',
        isActive: true,
        lastLogin: new Date().toISOString(),
      });

      navigate('/today');
    } catch (error) {
      console.error('Onboarding error:', error);
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-20">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="font-heading text-2xl text-foreground">LeadFlow AI</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="text-center pb-8">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="font-heading text-4xl text-foreground mb-3">
                Welcome to LeadFlow AI
              </CardTitle>
              <p className="font-paragraph text-lg text-muted-grey-foreground">
                Let's set up your business profile to get started
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="font-paragraph text-foreground">
                    Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    placeholder="Enter your business name"
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="font-paragraph text-foreground">
                    Industry *
                  </Label>
                  <Input
                    id="industry"
                    type="text"
                    required
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="e.g., Retail, Services, Manufacturing"
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="font-paragraph text-foreground">
                    Business Location *
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-grey" />
                    <Input
                      id="location"
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="City, State"
                      className="pl-10 border-gray-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName" className="font-paragraph text-foreground">
                    Branch Name
                  </Label>
                  <Input
                    id="branchName"
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => handleChange('branchName', e.target.value)}
                    placeholder="Main Branch (optional)"
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamSize" className="font-paragraph text-foreground">
                    Team Size *
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-grey" />
                    <Input
                      id="teamSize"
                      type="number"
                      required
                      min="1"
                      value={formData.teamSize}
                      onChange={(e) => handleChange('teamSize', e.target.value)}
                      placeholder="Number of team members"
                      className="pl-10 border-gray-200"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg font-semibold"
                  >
                    {loading ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
