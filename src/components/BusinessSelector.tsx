/**
 * Business Selector Component
 * PHASE 3D: Secure business context switching UI
 * 
 * Features:
 * - Display available businesses
 * - Indicate active business
 * - Switch business context
 * - Handle loading/error states
 * - Responsive design
 */

import React, { useEffect, useState } from 'react';
import { useBackendService } from '@/hooks/useBackendService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, Building2, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MembershipInfo {
  _id: string;
  businessId: string;
  businessName?: string;
  role?: string;
  branchId?: string;
  status: string;
}

interface BusinessSelectorProps {
  currentBusinessId?: string;
  onBusinessSwitch?: (businessId: string) => void;
  onError?: (error: string) => void;
}

export default function BusinessSelector({
  currentBusinessId,
  onBusinessSwitch,
  onError,
}: BusinessSelectorProps) {
  const { executeWithAuth, error, clearError } = useBackendService();
  const [memberships, setMemberships] = useState<MembershipInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Load authorized memberships on mount
  useEffect(() => {
    const loadMemberships = async () => {
      try {
        setIsLoading(true);
        clearError();
        setSwitchError(null);

        const result = await executeWithAuth(async (authContext) => {
          if (!authContext) {
            throw new Error('Not authenticated');
          }

          // Call backend to discover memberships
          const response = await fetch('/api/business/memberships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId: authContext.memberId }),
          });

          if (!response.ok) {
            throw new Error('Failed to load memberships');
          }

          return response.json();
        });

        if (result && Array.isArray(result.memberships)) {
          setMemberships(result.memberships);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load memberships';
        setSwitchError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMemberships();
  }, [executeWithAuth, clearError, onError]);

  // Handle business switch
  const handleSwitchBusiness = async (targetBusinessId: string) => {
    if (targetBusinessId === currentBusinessId) {
      setIsOpen(false);
      return;
    }

    try {
      setIsSwitching(true);
      setSwitchError(null);
      clearError();

      const result = await executeWithAuth(async (authContext) => {
        if (!authContext) {
          throw new Error('Not authenticated');
        }

        // Call backend to switch context
        const response = await fetch('/api/business/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: authContext.memberId,
            targetBusinessId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to switch business');
        }

        return response.json();
      });

      if (result && result.success) {
        setIsOpen(false);
        if (onBusinessSwitch) {
          onBusinessSwitch(targetBusinessId);
        }
        // Optionally reload page or trigger data refresh
        window.location.reload();
      } else {
        throw new Error(result?.error || 'Context switch failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to switch business';
      setSwitchError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  // Get current business info
  const currentBusiness = memberships.find(
    (m) => m.businessId === currentBusinessId
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <LoadingSpinner />
        <span className="text-sm text-muted-grey">Loading businesses...</span>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="w-4 h-4" />
        <span>No businesses available</span>
      </div>
    );
  }

  if (memberships.length === 1) {
    // Single business - show as static display
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-muted-grey/20">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {currentBusiness?.businessName || 'Business'}
        </span>
        {currentBusiness?.role && (
          <span className="text-xs text-muted-grey">
            ({currentBusiness.role})
          </span>
        )}
      </div>
    );
  }

  // Multiple businesses - show dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-muted-grey/20 hover:border-primary/50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium truncate max-w-[150px]">
          {currentBusiness?.businessName || 'Select Business'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-grey transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg border border-muted-grey/20 shadow-lg z-50"
          >
            <div className="p-2">
              {switchError && (
                <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{switchError}</span>
                </div>
              )}

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {memberships.map((membership) => (
                  <button
                    key={membership._id}
                    onClick={() => handleSwitchBusiness(membership.businessId)}
                    disabled={isSwitching || membership.businessId === currentBusinessId}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                      membership.businessId === currentBusinessId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-background text-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2 flex-1 text-left">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          {membership.businessName || 'Unknown Business'}
                        </div>
                        {membership.role && (
                          <div className="text-xs text-muted-grey">
                            {membership.role}
                            {membership.branchId && ` • ${membership.branchId}`}
                          </div>
                        )}
                      </div>
                    </div>
                    {membership.businessId === currentBusinessId && (
                      <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
