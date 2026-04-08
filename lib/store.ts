"use client"

import type { User, Package, UserSubscription, Video, VideoRating, Withdrawal } from "./types"

// Storage keys
const STORAGE_KEYS = {
  USERS: "adstar_users",
  PACKAGES: "adstar_packages",
  SUBSCRIPTIONS: "adstar_subscriptions",
  VIDEOS: "adstar_videos",
  RATINGS: "adstar_ratings",
  WITHDRAWALS: "adstar_withdrawals",
  CURRENT_USER: "adstar_current_user",
} as const

// Helper to generate UUID
export function generateId(): string {
  return crypto.randomUUID()
}

// Generic localStorage helpers
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue
  const item = localStorage.getItem(key)
  return item ? JSON.parse(item) : defaultValue
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

// Default packages
const DEFAULT_PACKAGES: Package[] = [
  {
    id: "pkg_basic",
    name: "Basic",
    price_usdt: 20,
    daily_earnings: 1,
    duration_days: 30,
    videos_per_day: 5,
    isActive: true,
  },
  {
    id: "pkg_standard",
    name: "Standard",
    price_usdt: 50,
    daily_earnings: 3,
    duration_days: 30,
    videos_per_day: 10,
    isActive: true,
  },
  {
    id: "pkg_pro",
    name: "Pro",
    price_usdt: 100,
    daily_earnings: 7,
    duration_days: 30,
    videos_per_day: 20,
    isActive: true,
  },
]

// Default videos for rating
const DEFAULT_VIDEOS: Video[] = [
  {
    id: "vid_1",
    title: "Introduction to Crypto Trading",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    orderIndex: 1,
    isActive: true,
  },
  {
    id: "vid_2",
    title: "Understanding Blockchain Technology",
    youtubeUrl: "https://www.youtube.com/watch?v=SSo_EIwHSd4",
    thumbnailUrl: "https://img.youtube.com/vi/SSo_EIwHSd4/maxresdefault.jpg",
    orderIndex: 2,
    isActive: true,
  },
  {
    id: "vid_3",
    title: "DeFi Explained Simply",
    youtubeUrl: "https://www.youtube.com/watch?v=17QRFlml4pA",
    thumbnailUrl: "https://img.youtube.com/vi/17QRFlml4pA/maxresdefault.jpg",
    orderIndex: 3,
    isActive: true,
  },
  {
    id: "vid_4",
    title: "NFTs and Digital Art",
    youtubeUrl: "https://www.youtube.com/watch?v=Oz9zw7-_vhM",
    thumbnailUrl: "https://img.youtube.com/vi/Oz9zw7-_vhM/maxresdefault.jpg",
    orderIndex: 4,
    isActive: true,
  },
  {
    id: "vid_5",
    title: "Web3 Future Vision",
    youtubeUrl: "https://www.youtube.com/watch?v=nHhAEkG1y2U",
    thumbnailUrl: "https://img.youtube.com/vi/nHhAEkG1y2U/maxresdefault.jpg",
    orderIndex: 5,
    isActive: true,
  },
]

// Initialize store with defaults
export function initializeStore(): void {
  if (typeof window === "undefined") return
  
  // Initialize packages if not exist
  if (!localStorage.getItem(STORAGE_KEYS.PACKAGES)) {
    setItem(STORAGE_KEYS.PACKAGES, DEFAULT_PACKAGES)
  }
  
  // Initialize videos if not exist
  if (!localStorage.getItem(STORAGE_KEYS.VIDEOS)) {
    setItem(STORAGE_KEYS.VIDEOS, DEFAULT_VIDEOS)
  }
  
  // Initialize empty arrays for other collections
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    setItem(STORAGE_KEYS.USERS, [])
  }
  if (!localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS)) {
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, [])
  }
  if (!localStorage.getItem(STORAGE_KEYS.RATINGS)) {
    setItem(STORAGE_KEYS.RATINGS, [])
  }
  if (!localStorage.getItem(STORAGE_KEYS.WITHDRAWALS)) {
    setItem(STORAGE_KEYS.WITHDRAWALS, [])
  }
}

// ==================== USER OPERATIONS ====================

export function getUsers(): User[] {
  return getItem<User[]>(STORAGE_KEYS.USERS, [])
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id)
}

export function getUserByEmail(emailOrPhone: string): User | undefined {
  const identifier = emailOrPhone.toLowerCase()
  return getUsers().find((u) => 
    (u.email && u.email.toLowerCase() === identifier) || 
    (u.phone && u.phone === emailOrPhone)
  )
}

export function createUser(userData: Omit<User, "id" | "createdAt" | "balance_usdt">): User {
  const users = getUsers()
  const newUser: User = {
    ...userData,
    id: generateId(),
    balance_usdt: 0,
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  setItem(STORAGE_KEYS.USERS, users)
  return newUser
}

export function updateUser(id: string, updates: Partial<User>): User | undefined {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return undefined
  
  users[index] = { ...users[index], ...updates }
  setItem(STORAGE_KEYS.USERS, users)
  return users[index]
}

export function deleteUser(id: string): boolean {
  const users = getUsers()
  const filtered = users.filter((u) => u.id !== id)
  if (filtered.length === users.length) return false
  setItem(STORAGE_KEYS.USERS, filtered)
  return true
}

// Current user session
export function getCurrentUser(): User | null {
  const userId = getItem<string | null>(STORAGE_KEYS.CURRENT_USER, null)
  if (!userId) return null
  return getUserById(userId) || null
}

export function setCurrentUser(userId: string | null): void {
  setItem(STORAGE_KEYS.CURRENT_USER, userId)
}

// ==================== PACKAGE OPERATIONS ====================

export function getPackages(): Package[] {
  return getItem<Package[]>(STORAGE_KEYS.PACKAGES, DEFAULT_PACKAGES)
}

export function getPackageById(id: string): Package | undefined {
  return getPackages().find((p) => p.id === id)
}

// ==================== SUBSCRIPTION OPERATIONS ====================

export function getSubscriptions(): UserSubscription[] {
  return getItem<UserSubscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, [])
}

export function getSubscriptionsByUser(userId: string): UserSubscription[] {
  return getSubscriptions().filter((s) => s.userId === userId)
}

export function getActiveSubscription(userId: string): UserSubscription | undefined {
  return getSubscriptions().find(
    (s) => s.userId === userId && s.status === "active" && new Date(s.expiresAt!) > new Date()
  )
}

export function getPendingSubscriptions(): UserSubscription[] {
  return getSubscriptions().filter((s) => s.status === "pending")
}

export function createSubscription(data: Omit<UserSubscription, "id" | "createdAt">): UserSubscription {
  const subscriptions = getSubscriptions()
  const newSub: UserSubscription = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  subscriptions.push(newSub)
  setItem(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions)
  return newSub
}

export function updateSubscription(id: string, updates: Partial<UserSubscription>): UserSubscription | undefined {
  const subscriptions = getSubscriptions()
  const index = subscriptions.findIndex((s) => s.id === id)
  if (index === -1) return undefined
  
  subscriptions[index] = { ...subscriptions[index], ...updates }
  setItem(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions)
  return subscriptions[index]
}

// ==================== VIDEO OPERATIONS ====================

export function getVideos(): Video[] {
  return getItem<Video[]>(STORAGE_KEYS.VIDEOS, DEFAULT_VIDEOS)
}

export function getActiveVideos(): Video[] {
  return getVideos().filter((v) => v.isActive).sort((a, b) => a.orderIndex - b.orderIndex)
}

export function getVideoById(id: string): Video | undefined {
  return getVideos().find((v) => v.id === id)
}

export function createVideo(data: Omit<Video, "id">): Video {
  const videos = getVideos()
  const newVideo: Video = {
    ...data,
    id: generateId(),
  }
  videos.push(newVideo)
  setItem(STORAGE_KEYS.VIDEOS, videos)
  return newVideo
}

export function updateVideo(id: string, updates: Partial<Video>): Video | undefined {
  const videos = getVideos()
  const index = videos.findIndex((v) => v.id === id)
  if (index === -1) return undefined
  
  videos[index] = { ...videos[index], ...updates }
  setItem(STORAGE_KEYS.VIDEOS, videos)
  return videos[index]
}

export function deleteVideo(id: string): boolean {
  const videos = getVideos()
  const filtered = videos.filter((v) => v.id !== id)
  if (filtered.length === videos.length) return false
  setItem(STORAGE_KEYS.VIDEOS, filtered)
  return true
}

// ==================== RATING OPERATIONS ====================

export function getRatings(): VideoRating[] {
  return getItem<VideoRating[]>(STORAGE_KEYS.RATINGS, [])
}

export function getRatingsByUser(userId: string): VideoRating[] {
  return getRatings().filter((r) => r.userId === userId)
}

export function getTodayRatings(userId: string): VideoRating[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return getRatingsByUser(userId).filter((r) => new Date(r.ratedAt) >= today)
}

export function getLastRatingTime(userId: string): Date | null {
  const ratings = getRatingsByUser(userId)
  if (ratings.length === 0) return null
  
  const sorted = ratings.sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime())
  return new Date(sorted[0].ratedAt)
}

export function createRating(data: Omit<VideoRating, "id" | "ratedAt">): VideoRating {
  const ratings = getRatings()
  const newRating: VideoRating = {
    ...data,
    id: generateId(),
    ratedAt: new Date().toISOString(),
  }
  ratings.push(newRating)
  setItem(STORAGE_KEYS.RATINGS, ratings)
  return newRating
}

// ==================== WITHDRAWAL OPERATIONS ====================

export function getWithdrawals(): Withdrawal[] {
  return getItem<Withdrawal[]>(STORAGE_KEYS.WITHDRAWALS, [])
}

export function getWithdrawalsByUser(userId: string): Withdrawal[] {
  return getWithdrawals().filter((w) => w.userId === userId)
}

export function getPendingWithdrawals(): Withdrawal[] {
  return getWithdrawals().filter((w) => w.status === "pending")
}

export function createWithdrawal(data: Omit<Withdrawal, "id" | "requestedAt">): Withdrawal {
  const withdrawals = getWithdrawals()
  const newWithdrawal: Withdrawal = {
    ...data,
    id: generateId(),
    requestedAt: new Date().toISOString(),
  }
  withdrawals.push(newWithdrawal)
  setItem(STORAGE_KEYS.WITHDRAWALS, withdrawals)
  return newWithdrawal
}

export function updateWithdrawal(id: string, updates: Partial<Withdrawal>): Withdrawal | undefined {
  const withdrawals = getWithdrawals()
  const index = withdrawals.findIndex((w) => w.id === id)
  if (index === -1) return undefined
  
  withdrawals[index] = { ...withdrawals[index], ...updates }
  setItem(STORAGE_KEYS.WITHDRAWALS, withdrawals)
  return withdrawals[index]
}

// ==================== STATS ====================

export function getDashboardStats() {
  const users = getUsers()
  const subscriptions = getSubscriptions()
  const withdrawals = getWithdrawals()
  
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active" && new Date(s.expiresAt!) > new Date()
  ).length
  
  const pendingSubscriptions = subscriptions.filter((s) => s.status === "pending").length
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending").length
  
  const totalPaidOut = withdrawals
    .filter((w) => w.status === "approved")
    .reduce((sum, w) => sum + w.amount_usdt, 0)
  
  const totalEarnings = users.reduce((sum, u) => sum + u.balance_usdt, 0) + totalPaidOut
  
  return {
    totalUsers: users.length,
    activeSubscriptions,
    pendingSubscriptions,
    pendingWithdrawals,
    totalPaidOut,
    totalEarnings,
  }
}
