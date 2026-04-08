// User/Profile type
export interface User {
  id: string
  email?: string
  phone?: string
  password?: string
  securityPassword?: string
  fullName: string
  walletAddress?: string
  balance_usdt: number
  isAdmin: boolean
  inviteCode?: string
  referredBy?: string
  createdAt: string
  lastRatedAt?: string
}

// Package/Subscription tier
export interface Package {
  id: string
  name: "Basic" | "Standard" | "Pro"
  price_usdt: number
  daily_earnings: number
  duration_days: number
  videos_per_day: number
  isActive: boolean
}

// User subscription record
export interface UserSubscription {
  id: string
  userId: string
  packageId: string
  txHash: string
  status: "pending" | "active" | "expired" | "rejected"
  startedAt?: string
  expiresAt?: string
  createdAt: string
}

// Video to rate
export interface Video {
  id: string
  title: string
  youtubeUrl: string
  thumbnailUrl?: string
  orderIndex: number
  isActive: boolean
}

// Video rating record
export interface VideoRating {
  id: string
  userId: string
  videoId: string
  rating: number
  earned_usdt: number
  ratedAt: string
}

// Withdrawal request
export interface Withdrawal {
  id: string
  userId: string
  amount_usdt: number
  walletAddress: string
  status: "pending" | "approved" | "rejected"
  requestedAt: string
  processedAt?: string
}

// Auth context state
export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Stats for admin dashboard
export interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  pendingSubscriptions: number
  pendingWithdrawals: number
  totalPaidOut: number
  totalEarnings: number
}
