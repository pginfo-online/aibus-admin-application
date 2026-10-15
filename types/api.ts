// ---------------------------------------------------------------------------
// AiBus Admin Panel — Authoritative Domain & API Types
// Derived directly from backend schema & verified admin contracts
// ---------------------------------------------------------------------------

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUPPORT'
  | 'SUPPORT_AGENT'
  | 'OPERATOR_AGENT'
  | 'CUSTOMER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type BookingStatus =
  | 'INITIATED'
  | 'HOLD_REQUESTED'
  | 'HELD'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'CONFIRMATION_PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'RECONCILED'
  | 'DISPUTED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type RefundStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export type RefundDestination = 'ORIGINAL_PAYMENT_METHOD' | 'WALLET';

export type OperatorStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_REVIEW'
  | 'DEACTIVATED';

export type CouponType = 'PERCENTAGE' | 'FLAT' | 'CASHBACK';

export type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'DISABLED';

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED';

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SupportCategory =
  | 'BOOKING'
  | 'PAYMENT'
  | 'REFUND'
  | 'CANCELLATION'
  | 'GENERAL'
  | 'OTHER';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';

export type NotificationType =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_CANCELLATION'
  | 'REFUND_PROCESSED'
  | 'PAYMENT_REMINDER'
  | 'TRIP_REMINDER';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export type SystemConfigType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

// ---------------------------------------------------------------------------
// Pagination & Response Wrappers
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  walletBalance?: number;
  createdAt: string;
}

export interface LoginResponseData {
  user: AdminUser;
  tokens: AuthTokens;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardOverviewData {
  period: 'today' | '7d' | '30d' | '90d' | '1y';
  dateFrom: string;
  users: {
    total: number;
    newInPeriod: number;
  };
  bookings: {
    total: number;
    inPeriod: number;
    confirmed: number;
    cancelled: number;
    conversionRate: string;
  };
  revenue: {
    total: number;
    inPeriod: number;
  };
  operations: {
    pendingRefunds: number;
    activeHolds: number;
    openSupportTickets: number;
  };
  inventory: {
    totalCities: number;
    totalOperators: number;
  };
  generatedAt: string;
}

export interface RevenueTimelineItem {
  period: string;
  revenue: number;
  transactions: number;
  avgTransaction: number;
}

export interface RevenueByOperatorItem {
  operatorName: string;
  revenue: number;
  bookings: number;
}

export interface RevenueAnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  timeline: RevenueTimelineItem[];
  byOperator: RevenueByOperatorItem[];
}

export interface BookingAnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  statusDistribution: Array<{ status: string; count: number }>;
  timeline: Array<{ period: string; totalBookings: number; confirmedBookings: number }>;
  topRoutes: Array<{ fromCity: string; toCity: string; count: number }>;
}

export interface UserAnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  roleDistribution: Array<{ role: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  registrationTrends: Array<{ period: string; newUsers: number }>;
  topUsers: Array<{
    userId: string;
    name: string;
    email: string;
    bookings: number;
    totalSpent: number;
  }>;
}

export interface SystemHealthData {
  status: 'healthy' | 'degraded';
  services: {
    database: { status: 'connected' | 'disconnected' };
    redis: {
      status: 'connected' | 'disconnected';
      memoryUsed?: string;
      connectedClients?: string;
    };
  };
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface DetailedSystemHealthData {
  status: 'operational' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'healthy' | 'unhealthy';
    latencyMs: number;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    latencyMs: number;
    memoryUsed: string;
  };
  process: {
    nodeVersion: string;
    pid: number;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UserListItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  walletBalance?: number;
  createdAt: string;
  _count?: {
    bookings: number;
  };
}

export interface UserDetailsData extends UserListItem {
  bookings?: BookingListItem[];
  payments?: PaymentListItem[];
  walletTransactions?: WalletTransactionItem[];
}

export interface WalletTransactionItem {
  id: string;
  userId: string;
  amount: number;
  type: string;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export interface BookingListItem {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  totalFare: number;
  fromCityName: string;
  toCityName: string;
  journeyDate: string;
  operatorName: string;
  busType?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  providerTicketNo?: string | null;
  providerPnrNo?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  userId?: string | null;
  _count?: {
    seats: number;
    passengers: number;
  };
}

export interface BookingSeatItem {
  id: string;
  seatNumber: string;
  fare: number;
  deck?: string;
  seatType?: string;
}

export interface BookingPassengerItem {
  id: string;
  name: string;
  age: number;
  gender: string;
  seatNumber: string;
}

export interface BookingDetailsData extends BookingListItem {
  seats: BookingSeatItem[];
  passengers: BookingPassengerItem[];
  payments: PaymentListItem[];
  ticket?: {
    id: string;
    ticketNumber: string;
    status: string;
    pdfUrl?: string | null;
  } | null;
  cancellations: CancellationListItem[];
  refunds: RefundListItem[];
  providerTransactions: ProviderTransactionListItem[];
  user?: {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
  } | null;
}

export interface BookingStatsData {
  statusDistribution?: Array<{ status: string; count: number }>;
  todayBookings?: number;
  totalConfirmedRevenue?: number;
  totalBookings?: number;
  confirmedBookings?: number;
  cancelledBookings?: number;
  pendingBookings?: number;
  failedBookings?: number;
  totalRevenue?: number;
  averageFare?: number;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface PaymentListItem {
  id: string;
  bookingId: string;
  userId?: string | null;
  amount: number;
  currency: string;
  gateway: string;
  status: PaymentStatus;
  gatewayTransactionId?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    bookingNumber: string;
    contactName: string;
    operatorName: string;
  };
}

export interface PaymentStatsData {
  totalPayments: number;
  successCount: number;
  failedCount: number;
  totalVolume: number;
  successVolume: number;
}

// ---------------------------------------------------------------------------
// Refunds & Cancellations
// ---------------------------------------------------------------------------

export interface RefundListItem {
  id: string;
  bookingId: string;
  paymentId: string;
  amount: number;
  status: RefundStatus;
  destination: RefundDestination;
  gatewayRefundId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    bookingNumber: string;
    contactName: string;
  };
}

export interface RefundStatsData {
  totalRefunds?: number;
  pendingRefunds?: number;
  completedRefunds?: number;
  failedRefunds?: number;
  totalRefundedAmount?: number;
  byStatus?: Record<string, { count: number; totalAmount: number }>;
}

export interface CancellationListItem {
  id: string;
  bookingId: string;
  reason: string;
  refundAmount?: number;
  cancellationCharge?: number;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export interface CityListItem {
  id: string;
  name: string;
  state?: string | null;
  providerCityId?: number | null;
  providerName: string;
  aliases: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

export interface OperatorListItem {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  status: OperatorStatus;
  providerName: string;
  providerOperatorId?: string | null;
  commissionPct: number;
  gstNumber?: string | null;
  panNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bookings: number;
  };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export interface CouponListItem {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  status: CouponStatus;
  description?: string | null;
  termsAndConditions?: string | null;
  usageLimit?: number | null;
  usageLimitPerUser?: number | null;
  usedCount: number;
  applicableRoutes: string[];
  applicableOperators: string[];
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsageStatsData {
  coupon: CouponListItem;
  totalUses: number;
  uniqueUsers: number;
  totalDiscountGiven: number;
  usageLog: Array<{
    id: string;
    userId: string;
    bookingId: string;
    discountAmount: number;
    usedAt: string;
    user?: { email: string; fullName?: string };
    booking?: { bookingNumber: string };
  }>;
}

// ---------------------------------------------------------------------------
// Support Grievance Desk
// ---------------------------------------------------------------------------

export interface SupportTicketListItem {
  id: string;
  ticketNumber: string;
  userId?: string | null;
  bookingId?: string | null;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    fullName?: string;
    email: string;
    phone?: string;
  };
  booking?: {
    bookingNumber: string;
    operatorName: string;
  };
  assignedAgent?: {
    fullName?: string;
    email: string;
  };
  _count?: {
    replies: number;
  };
}

export interface SupportTicketReplyItem {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender?: {
    fullName?: string;
    email: string;
  };
}

export interface SupportTicketDetailsData extends SupportTicketListItem {
  replies: SupportTicketReplyItem[];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotificationListItem {
  id: string;
  userId?: string | null;
  bookingId?: string | null;
  channel: NotificationChannel;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  title: string;
  content: string;
  sentAt?: string | null;
  error?: string | null;
  createdAt: string;
}

export interface NotificationTemplateItem {
  id: string;
  name: string;
  channels: NotificationChannel[];
  placeholders: string[];
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export interface AuditLogListItem {
  id: string;
  adminId: string;
  action: string;
  module: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: string;
  admin?: {
    email: string;
    fullName?: string;
    role: string;
  };
}

// ---------------------------------------------------------------------------
// System Configuration & Feature Flags
// ---------------------------------------------------------------------------

export interface SystemConfigItem {
  key: string;
  value: string;
  type: SystemConfigType;
  description?: string | null;
  group: string;
  isSecret: boolean;
  updatedAt: string;
}

export interface FeatureFlagItem {
  key: string;
  enabled: boolean;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Provider Management
// ---------------------------------------------------------------------------

export interface ProviderItem {
  name: string;
  type: 'INVENTORY' | 'PAYMENT_GATEWAY';
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  balance?: number | null;
  currency?: string;
  lastChecked?: string;
}

export interface ProviderTransactionListItem {
  id: string;
  providerName: string;
  operation: string;
  bookingId?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  responseStatus?: number | null;
  durationMs?: number | null;
  error?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Granular Permissions
// ---------------------------------------------------------------------------

export const AdminPermission = {
  DASHBOARD_VIEW: 'dashboard:view',
  USERS_LIST: 'users:list',
  USERS_VIEW: 'users:view',
  USERS_UPDATE: 'users:update',
  USERS_SUSPEND: 'users:suspend',
  USERS_DELETE: 'users:delete',
  BOOKINGS_LIST: 'bookings:list',
  BOOKINGS_VIEW: 'bookings:view',
  BOOKINGS_UPDATE_STATUS: 'bookings:update_status',
  BOOKINGS_CANCEL: 'bookings:cancel',
  BOOKINGS_RECONCILE: 'bookings:reconcile',
  PAYMENTS_LIST: 'payments:list',
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_RECONCILE: 'payments:reconcile',
  PAYMENT_GATEWAYS_MANAGE: 'payments:gateways_manage',
  REFUNDS_LIST: 'refunds:list',
  REFUNDS_VIEW: 'refunds:view',
  REFUNDS_PROCESS: 'refunds:process',
  REFUNDS_RETRY: 'refunds:retry',
  CITIES_LIST: 'cities:list',
  CITIES_MANAGE: 'cities:manage',
  OPERATORS_LIST: 'operators:list',
  OPERATORS_VIEW: 'operators:view',
  OPERATORS_MANAGE: 'operators:manage',
  COUPONS_LIST: 'coupons:list',
  COUPONS_VIEW: 'coupons:view',
  COUPONS_MANAGE: 'coupons:manage',
  SUPPORT_VIEW: 'support:view',
  SUPPORT_MANAGE: 'support:manage',
  NOTIFICATIONS_VIEW: 'notifications:view',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  NOTIFICATIONS_BROADCAST: 'notifications:broadcast',
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_FEATURE_FLAGS: 'system:feature_flags',
  SYSTEM_HEALTH: 'system:health',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  PROVIDERS_VIEW: 'providers:view',
  PROVIDERS_MANAGE: 'providers:manage',

  // B2B Agent Management Permissions
  AGENTS_LIST: 'agents:list',
  AGENTS_VIEW: 'agents:view',
  AGENTS_KYC_REVIEW: 'agents:kyc_review',
  AGENTS_SUSPEND: 'agents:suspend',
  AGENTS_CREDIT_MANAGE: 'agents:credit_manage',

  // Commission Management Permissions
  COMMISSIONS_LIST: 'commissions:list',
  COMMISSIONS_MANAGE: 'commissions:manage',

  // Financial Ledger & Reconciliation Permissions
  LEDGER_VIEW: 'ledger:view',
  LEDGER_RECONCILE: 'ledger:reconcile',
  LEDGER_ADJUST: 'ledger:adjust',
} as const;

export type AdminPermissionKey = (typeof AdminPermission)[keyof typeof AdminPermission];

// ---------------------------------------------------------------------------
// B2B Agent & KYC Management
// ---------------------------------------------------------------------------

export type AgentStatus =
  | 'PENDING_KYC'
  | 'KYC_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type AgentKycDocType =
  | 'PAN_CARD'
  | 'GST_CERTIFICATE'
  | 'BUSINESS_REGISTRATION'
  | 'BANK_STATEMENT'
  | 'OWNER_IDENTITY'
  | 'CANCELLED_CHEQUE';

export type AgentStaffRole =
  | 'OWNER'
  | 'MANAGER'
  | 'BOOKING_AGENT'
  | 'ACCOUNTANT'
  | 'VIEWER';

export interface AgentWalletItem {
  id: string;
  agentId: string;
  cashBalance: number;
  creditLimit: number;
  creditUsed: number;
  isFrozen: boolean;
  frozenReason?: string | null;
  frozenAt?: string | null;
  frozenBy?: string | null;
  totalTopups?: number;
  totalSpent?: number;
  totalCommission?: number;
  totalRefunds?: number;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentKycDocumentItem {
  id: string;
  agentId: string;
  docType: AgentKycDocType;
  fileUrl: string;
  storageKey: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  createdAt: string;
}

export interface AgentBankAccountItem {
  id: string;
  agentId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  isVerified: boolean;
  isPrimary: boolean;
  verifiedAt?: string | null;
  withdrawFreezeUntil?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentStaffItem {
  id: string;
  agentId: string;
  userId: string;
  role: AgentStaffRole;
  permissions?: unknown;
  isActive: boolean;
  invitedAt: string;
  joinedAt?: string | null;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string | null;
    role: string;
    status: string;
  };
}

export interface AgentListItem {
  id: string;
  businessName: string;
  contactPersonName: string;
  email: string;
  phone: string;
  businessAddress: string;
  city: string;
  state: string;
  pincode?: string | null;
  logoUrl?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  status: AgentStatus;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  wallet?: {
    cashBalance: number;
    creditLimit: number;
    creditUsed: number;
    isFrozen: boolean;
  };
  _count?: {
    bookings: number;
    staff?: number;
    kycDocuments?: number;
  };
}

export interface AgentDetailsData extends AgentListItem {
  wallet?: AgentWalletItem;
  kycDocuments: AgentKycDocumentItem[];
  bankAccounts: AgentBankAccountItem[];
  staff: AgentStaffItem[];
  _count?: {
    bookings: number;
    staff?: number;
    kycDocuments?: number;
  };
}

// ---------------------------------------------------------------------------
// Commission Engine
// ---------------------------------------------------------------------------

export type CommissionRuleType =
  | 'FLAT_PERCENTAGE'
  | 'FLAT_AMOUNT'
  | 'TIERED_BOOKING'
  | 'OPERATOR_SPECIFIC'
  | 'ROUTE_SPECIFIC';

export interface CommissionRuleItem {
  id: string;
  name: string;
  ruleType: CommissionRuleType;
  agentId?: string | null;
  operatorName?: string | null;
  fromCityId?: number | null;
  toCityId?: number | null;
  percentage?: number | null;
  flatAmount?: number | null;
  minFare?: number | null;
  maxCommission?: number | null;
  priority: number;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    businessName: string;
    email: string;
  } | null;
}

export interface CreateCommissionRuleInput {
  name: string;
  ruleType: CommissionRuleType;
  agentId?: string | null;
  operatorName?: string | null;
  fromCityId?: number | null;
  toCityId?: number | null;
  percentage?: number | null;
  flatAmount?: number | null;
  minFare?: number | null;
  maxCommission?: number | null;
  priority?: number;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
}

// ---------------------------------------------------------------------------
// Double-Entry Ledger & Platform Reconciliation
// ---------------------------------------------------------------------------

export type LedgerEntryType =
  | 'AGENT_WALLET_DEBIT'
  | 'AGENT_WALLET_CREDIT'
  | 'AGENT_WALLET_TOPUP'
  | 'COMMISSION_CREDIT'
  | 'COMMISSION_REVERSAL'
  | 'REFUND_CREDIT'
  | 'CONVENIENCE_FEE_DEBIT'
  | 'CREDIT_LIMIT_UTILIZATION'
  | 'CREDIT_LIMIT_RELEASE'
  | 'PLATFORM_REVENUE_CREDIT'
  | 'MANUAL_ADJUSTMENT';

export interface LedgerEntryItem {
  id: string;
  batchId: string;
  agentId?: string | null;
  bookingId?: string | null;
  cancellationId?: string | null;
  refundId?: string | null;
  topupId?: string | null;
  type: LedgerEntryType;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description: string;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  postedAt: string;
  createdBy?: string | null;
  agent?: {
    id: string;
    businessName: string;
    email: string;
  } | null;
  booking?: {
    bookingNumber: string;
  } | null;
}

export interface ReconciliationAgentReportItem {
  agentId: string;
  businessName: string;
  status: AgentStatus;
  currentBalance: number;
  calculatedBalance: number;
  totalCredits: number;
  totalDebits: number;
  discrepancy: number;
  reconciliationStatus: 'MATCHED' | 'DISCREPANCY_DETECTED';
}

export interface ReconciliationReportData {
  totalAgentsAudited: number;
  matchedAgents: number;
  discrepantAgents: number;
  auditTimestamp: string;
  agents: ReconciliationAgentReportItem[];
}

export interface ManualAdjustmentInput {
  agentId: string;
  amount: number;
  direction: 'CREDIT_AGENT' | 'DEBIT_AGENT';
  reason: string;
  idempotencyKey?: string;
}

// ---------------------------------------------------------------------------
// Payment Gateway Orchestration & Multi-PG Management
// ---------------------------------------------------------------------------

export interface PaymentGatewayConfigItem {
  id: string;
  gateway: string;
  name: string;
  isEnabled: boolean;
  isPrimary: boolean;
  priority: number;
  supportedMethods: string[];
  mode: string;
  trafficWeight: number;
  failureThresholdPct?: number;
  consecutiveFailures?: number;
  isHealthy: boolean;
  isCircuitOpen?: boolean;
  totalSuccesses?: number;
  totalFailures?: number;
  lastHealthCheck?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GatewayMetricsData {
  gateways: PaymentGatewayConfigItem[];
  transactionAggregates: Array<{
    gateway: string;
    status: string;
    _count: { id: number };
    _sum: { amount: number | null };
  }>;
  generatedAt: string;
}

export interface UpdateGatewayConfigInput {
  isEnabled?: boolean;
  isPrimary?: boolean;
  mode?: 'LIVE' | 'TEST' | 'MAINTENANCE';
  trafficWeight?: number;
  supportedMethods?: string[];
  priority?: number;
}

