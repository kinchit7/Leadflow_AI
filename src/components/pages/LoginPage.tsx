import { useMember } from '@/integrations';
import { SignIn } from '@/components/ui/sign-in';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { actions } = useMember();

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
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 rounded-lg p-8 lg:p-12">
            <div className="text-center mb-8">
              <h1 className="font-heading text-4xl text-foreground mb-3">
                Welcome Back
              </h1>
              <p className="font-paragraph text-muted-grey-foreground">
                Sign in to access your LeadFlow AI account
              </p>
            </div>

            <SignIn
              onLoginClick={actions.login}
              className="w-full"
              buttonText="Sign In / Sign Up"
            />

            <div className="mt-8 text-center">
              <p className="font-paragraph text-sm text-muted-grey-foreground">
                New to LeadFlow AI? Sign up to get started with your free trial.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
