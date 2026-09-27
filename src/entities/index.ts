/**
 * Auto-generated entity types
 * Contains all CMS collection interfaces in a single file 
 */

/**
 * Collection ID: activityevents
 * Interface for ActivityEvents
 */
export interface ActivityEvents {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  eventType?: string;
  /** @wixFieldType text */
  tenantId?: string;
  /** @wixFieldType text */
  customerId?: string;
  /** @wixFieldType text */
  actor?: string;
  /** @wixFieldType text */
  relatedRecordType?: string;
  /** @wixFieldType text */
  relatedRecordId?: string;
  /** @wixFieldType datetime */
  timestamp?: Date | string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType text */
  metadata?: string;
  /** @wixFieldType boolean */
  isDemo?: boolean;
}


/**
 * Collection ID: aicustomerbriefs
 * Interface for AICustomerBriefs
 */
export interface AICustomerBriefs {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  customerId?: string;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  briefContent?: string;
  /** @wixFieldType text */
  keyInsights?: string;
  /** @wixFieldType text */
  recommendedActions?: string;
  /** @wixFieldType text */
  riskFactors?: string;
  /** @wixFieldType text */
  opportunities?: string;
  /** @wixFieldType datetime */
  generatedAt?: Date | string;
  /** @wixFieldType text */
  generatedBy?: string;
  /** @wixFieldType text */
  aiProvider?: string;
  /** @wixFieldType text */
  modelVersion?: string;
  /** @wixFieldType boolean */
  isDemo?: boolean;
}


/**
 * Collection ID: auditlogs
 * Interface for AuditLogs
 */
export interface AuditLogs {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  actionPerformed?: string;
  /** @wixFieldType text */
  resourceAffected?: string;
  /** @wixFieldType datetime */
  timestamp?: Date | string;
  /** @wixFieldType text */
  userId?: string;
  /** @wixFieldType text */
  details?: string;
  /** @wixFieldType text */
  ipAddress?: string;
}


/**
 * Collection ID: branches
 * Interface for Branches
 */
export interface Branches {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  branchName?: string;
  /** @wixFieldType text */
  addressLine1?: string;
  /** @wixFieldType text */
  addressLine2?: string;
  /** @wixFieldType text */
  city?: string;
  /** @wixFieldType text */
  state?: string;
  /** @wixFieldType text */
  postalCode?: string;
  /** @wixFieldType text */
  phoneNumber?: string;
  /** @wixFieldType text */
  email?: string;
  /** @wixFieldType boolean */
  isActive?: boolean;
}


/**
 * Collection ID: businesses
 * Interface for Businesses
 */
export interface Businesses {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  businessName?: string;
  /** @wixFieldType text */
  industry?: string;
  /** @wixFieldType text */
  location?: string;
  /** @wixFieldType number */
  teamSize?: number;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  businessLogo?: string;
}


/**
 * Collection ID: channels
 * Interface for Channels
 */
export interface Channels {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  displayName?: string;
  /** @wixFieldType text */
  channelType?: string;
  /** @wixFieldType text */
  connectionStatus?: string;
  /** @wixFieldType url */
  configurationUrl?: string;
  /** @wixFieldType datetime */
  lastUpdated?: Date | string;
}


/**
 * Collection ID: conversations
 * Interface for Conversations
 */
export interface Conversations {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  subject?: string;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  status?: string;
  /** @wixFieldType datetime */
  lastActivityAt?: Date | string;
  /** @wixFieldType text */
  customerName?: string;
  /** @wixFieldType text */
  channel?: string;
  /** @wixFieldType number */
  unreadMessages?: number;
  /** @wixFieldType boolean */
  isPinned?: boolean;
}


/**
 * Collection ID: customeridentities
 * Interface for CustomerIdentities
 */
export interface CustomerIdentities {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  customerId?: string;
  /** @wixFieldType text */
  channelType?: string;
  /** @wixFieldType text */
  externalId?: string;
  /** @wixFieldType text */
  identityStatus?: string;
  /** @wixFieldType datetime */
  lastSyncDate?: Date | string;
}


/**
 * Collection ID: customers
 * Interface for Customers
 */
export interface Customers {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  fullName?: string;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  email?: string;
  /** @wixFieldType text */
  phoneNumber?: string;
  /** @wixFieldType text */
  address?: string;
  /** @wixFieldType text */
  city?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  profilePicture?: string;
  /** @wixFieldType text */
  notes?: string;
}


/**
 * Collection ID: faqs
 * Interface for FrequentlyAskedQuestions
 */
export interface FrequentlyAskedQuestions {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  question?: string;
  /** @wixFieldType text */
  answer?: string;
  /** @wixFieldType text */
  category?: string;
  /** @wixFieldType text */
  keywords?: string;
  /** @wixFieldType boolean */
  isPublished?: boolean;
  /** @wixFieldType datetime */
  lastUpdated?: Date | string;
}


/**
 * Collection ID: followups
 * Interface for Followups
 */
export interface Followups {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  title?: string;
  /** @wixFieldType date */
  dueDate?: Date | string;
  /** @wixFieldType text */
  status?: string;
  /** @wixFieldType text */
  relatedRecordType?: string;
  /** @wixFieldType text */
  relatedRecordId?: string;
  /** @wixFieldType text */
  owner?: string;
  /** @wixFieldType text */
  notes?: string;
  /** @wixFieldType datetime */
  createdAt?: Date | string;
}


/**
 * Collection ID: knowledgeitems
 * Interface for KnowledgeItems
 */
export interface KnowledgeItems {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  title?: string;
  /** @wixFieldType text */
  content?: string;
  /** @wixFieldType text */
  category?: string;
  /** @wixFieldType datetime */
  lastUpdated?: Date | string;
  /** @wixFieldType boolean */
  isActive?: boolean;
  /** @wixFieldType text */
  appliesToDay?: string;
  /** @wixFieldType time */
  openingTime?: any;
  /** @wixFieldType time */
  closingTime?: any;
}


/**
 * Collection ID: leads
 * Interface for Leads
 */
export interface Leads {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType datetime */
  priorityOverrideDate?: Date | string;
  /** @wixFieldType boolean */
  priorityOverride?: boolean;
  /** @wixFieldType text */
  priorityOverrideBy?: string;
  /** @wixFieldType text */
  priorityOverrideReason?: string;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  customer?: string;
  /** @wixFieldType text */
  source?: string;
  /** @wixFieldType text */
  priority?: string;
  /** @wixFieldType text */
  stage?: string;
  /** @wixFieldType text */
  owner?: string;
  /** @wixFieldType number */
  value?: number;
  /** @wixFieldType text */
  requirement?: string;
  /** @wixFieldType number */
  budget?: number;
  /** @wixFieldType text */
  location?: string;
  /** @wixFieldType text */
  timeline?: string;
  /** @wixFieldType datetime */
  nextFollowUp?: Date | string;
}


/**
 * Collection ID: messages
 * Interface for Messages
 */
export interface Messages {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  sender?: string;
  /** @wixFieldType text */
  content?: string;
  /** @wixFieldType datetime */
  timestamp?: Date | string;
  /** @wixFieldType text */
  messageType?: string;
  /** @wixFieldType boolean */
  isRead?: boolean;
  /** @wixFieldType url */
  attachmentUrl?: string;
  /** @wixFieldType text */
  direction?: string;
}


/**
 * Collection ID: notifications
 * Interface for Notifications
 */
export interface Notifications {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  title?: string;
  /** @wixFieldType text */
  message?: string;
  /** @wixFieldType boolean */
  isRead?: boolean;
  /** @wixFieldType datetime */
  createdAt?: Date | string;
  /** @wixFieldType text */
  notificationType?: string;
}


/**
 * Collection ID: opportunities
 * Interface for Opportunities
 */
export interface Opportunities {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  opportunityName?: string;
  /** @wixFieldType datetime */
  priorityOverrideDate?: Date | string;
  /** @wixFieldType text */
  priorityOverrideBy?: string;
  /** @wixFieldType text */
  priorityOverrideReason?: string;
  /** @wixFieldType boolean */
  priorityOverride?: boolean;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  leadTitle?: string;
  /** @wixFieldType number */
  pipelineValue?: number;
  /** @wixFieldType text */
  stage?: string;
  /** @wixFieldType date */
  expectedCloseDate?: Date | string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType text */
  owner?: string;
  /** @wixFieldType number */
  probability?: number;
}


/**
 * Collection ID: policies
 * Interface for BusinessPolicies
 */
export interface BusinessPolicies {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  policyTitle?: string;
  /** @wixFieldType text */
  policyContent?: string;
  /** @wixFieldType text */
  policyCategory?: string;
  /** @wixFieldType datetime */
  lastUpdated?: Date | string;
  /** @wixFieldType date */
  effectiveDate?: Date | string;
  /** @wixFieldType boolean */
  isActive?: boolean;
}


/**
 * Collection ID: products
 * @catalog This collection is an eCommerce catalog
 * Interface for Products
 */
export interface Products {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  itemName?: string;
  /** @wixFieldType number */
  itemPrice?: number;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  itemImage?: string;
  /** @wixFieldType text */
  itemDescription?: string;
  /** @wixFieldType text */
  productCategory?: string;
  /** @wixFieldType boolean */
  isAvailable?: boolean;
}


/**
 * Collection ID: roles
 * Interface for Roles
 */
export interface Roles {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  roleName?: string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType boolean */
  canManageUsers?: boolean;
  /** @wixFieldType boolean */
  canViewAnalytics?: boolean;
  /** @wixFieldType boolean */
  canCreateLeads?: boolean;
  /** @wixFieldType boolean */
  canManageSupportTickets?: boolean;
}


/**
 * Collection ID: services
 * @catalog This collection is an eCommerce catalog
 * Interface for Services
 */
export interface Services {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  itemName?: string;
  /** @wixFieldType number */
  itemPrice?: number;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  itemImage?: string;
  /** @wixFieldType text */
  itemDescription?: string;
  /** @wixFieldType text */
  serviceDuration?: string;
}


/**
 * Collection ID: subscriptions
 * Interface for Subscriptions
 */
export interface Subscriptions {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  planName?: string;
  /** @wixFieldType text */
  status?: string;
  /** @wixFieldType boolean */
  isTrialActive?: boolean;
  /** @wixFieldType datetime */
  trialEndDate?: Date | string;
  /** @wixFieldType datetime */
  subscriptionStartDate?: Date | string;
  /** @wixFieldType datetime */
  subscriptionEndDate?: Date | string;
  /** @wixFieldType number */
  leadsUsed?: number;
  /** @wixFieldType number */
  maxLeadsAllowed?: number;
}


/**
 * Collection ID: tickets
 * Interface for SupportTickets
 */
export interface SupportTickets {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  issueDescription?: string;
  /** @wixFieldType boolean */
  isDemo?: boolean;
  /** @wixFieldType text */
  businessId?: string;
  /** @wixFieldType text */
  status?: string;
  /** @wixFieldType text */
  customerName?: string;
  /** @wixFieldType text */
  assignedTo?: string;
  /** @wixFieldType text */
  priority?: string;
  /** @wixFieldType datetime */
  createdAt?: Date | string;
}


/**
 * Collection ID: users
 * Interface for Users
 */
export interface Users {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  firstName?: string;
  /** @wixFieldType text */
  lastName?: string;
  /** @wixFieldType text */
  email?: string;
  /** @wixFieldType text */
  phoneNumber?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  profilePicture?: string;
  /** @wixFieldType boolean */
  isActive?: boolean;
  /** @wixFieldType datetime */
  lastLogin?: Date | string;
}


/**
 * Collection ID: wallets
 * Interface for Wallets
 */
export interface Wallets {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  walletName?: string;
  /** @wixFieldType number */
  currentBalance?: number;
  /** @wixFieldType text */
  currencyCode?: string;
  /** @wixFieldType datetime */
  lastActivityDate?: Date | string;
  /** @wixFieldType boolean */
  isPrimary?: boolean;
}


/**
 * Collection ID: wallettransactions
 * Interface for WalletTransactions
 */
export interface WalletTransactions {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  walletId?: string;
  /** @wixFieldType text */
  transactionType?: string;
  /** @wixFieldType number */
  amount?: number;
  /** @wixFieldType datetime */
  timestamp?: Date | string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType text */
  status?: string;
}
