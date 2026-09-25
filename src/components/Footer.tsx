import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-200">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="font-heading text-2xl text-foreground">LeadFlow AI</span>
            </Link>
            <p className="font-paragraph text-muted-grey-foreground max-w-md">
              Your AI-powered Sales & Customer Support System. Every customer. Every enquiry. One intelligent system.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">Product</h3>
            <ul className="space-y-2 font-paragraph text-muted-grey-foreground">
              <li>
                <Link to="/today" className="hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/leads" className="hover:text-primary transition-colors">
                  Leads
                </Link>
              </li>
              <li>
                <Link to="/customers" className="hover:text-primary transition-colors">
                  Customers
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">Company</h3>
            <ul className="space-y-2 font-paragraph text-muted-grey-foreground">
              <li>
                <Link to="/settings" className="hover:text-primary transition-colors">
                  Settings
                </Link>
              </li>
              <li>
                <Link to="/team" className="hover:text-primary transition-colors">
                  Team
                </Link>
              </li>
              <li>
                <Link to="/billing" className="hover:text-primary transition-colors">
                  Billing
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="font-paragraph text-sm text-muted-grey-foreground">
              © {currentYear} LeadFlow AI. Built for Indian SMEs.
            </p>
            <div className="flex items-center space-x-6 font-paragraph text-sm text-muted-grey-foreground">
              <span>Bhopal, Madhya Pradesh</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
