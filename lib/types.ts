// User/Profile type

export type Network = 'trc20' | 'bep20'



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
  isBanned: boolean
  inviteCode?: string
  referredBy?: string
  createdAt: string
  lastRatedAt?: string
}

// Package/Subscription tier
export interface Package {
  id: string
  name: string
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




export interface NetworkConfig {
  id: Network
  name: string
  label: string
  icon: string
  adminWalletKey: string   // env var name — value accessed server-side only
  usdtContract: string
  decimals: number
  explorerTxUrl: string
  warnings: string[]
}
 
export interface DepositVerificationResult {
  success: boolean
  amount?: number
  error?: string
}
 
export interface Deposit {
  id: string
  user_id: string
  network: Network
  tx_hash: string
  amount_usdt: number
  status: 'confirmed' | 'failed'
  confirmed_at: string
  created_at: string
}
 
export interface SubmitDepositResult {
  success: boolean
  amount?: number
  error?: string
}