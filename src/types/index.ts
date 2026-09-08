// 安安记 · 核心类型定义（无登录模式）

export type RecordType = 'feeding' | 'sleep' | 'diaper' | 'milestone'

export type FeedingMethod = 'breast' | 'bottle' | 'solid'
export type BreastSide = 'left' | 'right' | 'both'
export type DiaperType = 'wet' | 'dirty' | 'mixed' | 'dry'
export type SleepQuality = 'good' | 'normal' | 'restless'
export type UserRole = 'mom' | 'dad' | 'grandma' | 'grandpa' | 'custom'

// 当前使用者（谁在记录），存 localStorage，无登录
export interface CurrentUser {
  name: string
  role: UserRole
}

// 宝宝档案
export interface Baby {
  id: string
  name: string
  fullName?: string
  gender: 'boy' | 'girl'
  birthday: string
  avatarColor?: string
  cover?: string
  note?: string
  createdAt: string
}

// 记录 - 通用字段
export interface BaseRecord {
  id: string
  babyId: string
  author?: string       // 谁记的（姓名）
  authorRole?: UserRole // 谁的角色
  type: RecordType
  datetime: string
  note?: string
  tags?: string[]
  createdAt: string
}

// 喂养记录
export interface FeedingRecord extends BaseRecord {
  type: 'feeding'
  method: FeedingMethod
  durationMin?: number
  side?: BreastSide
  amountMl?: number
  foodName?: string
  foodAmount?: string
}

// 睡眠记录
export interface SleepRecord extends BaseRecord {
  type: 'sleep'
  startTime: string
  endTime?: string
  durationMin?: number
  quality?: SleepQuality
  nightWakes?: number
  location?: string
}

// 换尿布记录
export interface DiaperRecord extends BaseRecord {
  type: 'diaper'
  diaperType: DiaperType
  rash?: boolean
}

// 里程碑
export interface MilestoneRecord extends BaseRecord {
  type: 'milestone'
  category: 'physical' | 'cognitive' | 'language' | 'social' | 'other'
  title: string
  achievedAt: string
  description?: string
}

export type AnyRecord =
  | FeedingRecord
  | SleepRecord
  | DiaperRecord
  | MilestoneRecord

export interface RecordTypeMeta {
  type: RecordType
  label: string
  icon: string
  color: string
  emoji: string
}

export const RECORD_TYPE_META: Record<RecordType, RecordTypeMeta> = {
  feeding: {
    type: 'feeding',
    label: '喂养',
    icon: 'Milk',
    color: 'apricot',
    emoji: '🍼'
  },
  sleep: {
    type: 'sleep',
    label: '睡眠',
    icon: 'Moon',
    color: 'dusk',
    emoji: '😴'
  },
  diaper: {
    type: 'diaper',
    label: '换尿布',
    icon: 'Baby',
    color: 'sage',
    emoji: '🧷'
  },
  milestone: {
    type: 'milestone',
    label: '里程碑',
    icon: 'Star',
    color: 'dusk',
    emoji: '⭐'
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  mom: '妈妈',
  dad: '爸爸',
  grandma: '奶奶 / 外婆',
  grandpa: '爷爷 / 外公',
  custom: '家人'
}

export const ROLE_EMOJI: Record<UserRole, string> = {
  mom: '👩',
  dad: '👨',
  grandma: '👵',
  grandpa: '👴',
  custom: '🙂'
}
