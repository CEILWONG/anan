// 安安记 · 核心类型定义（无登录模式）

export type RecordType = 'feeding' | 'diaper' | 'weight' | 'jaundice' | 'milestone'

export type FeedingMethod = 'breast' | 'formula' | 'pumped_milk'
export type BreastSide = 'left' | 'right' | 'both'
export type DiaperType = 'wet' | 'dirty' | 'mixed'
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
  avatar?: string // 头像图片相对 URL，如 /uploads/xxx.jpg
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
  durationMin?: number // 亲喂
  side?: BreastSide // 亲喂
  amountMl?: number // 瓶喂奶粉/母乳
}

// 换尿布记录
export interface DiaperRecord extends BaseRecord {
  type: 'diaper'
  diaperType: DiaperType
  rash?: boolean
}

// 体重记录
export interface WeightRecord extends BaseRecord {
  type: 'weight'
  weightKg: number
}

// 黄疸记录（头 / 胸 / 腹，单位 mg/dL，至少一个）
export interface JaundiceRecord extends BaseRecord {
  type: 'jaundice'
  faceValue?: number
  chestValue?: number
  abdomenValue?: number
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
  | DiaperRecord
  | WeightRecord
  | JaundiceRecord
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
  diaper: {
    type: 'diaper',
    label: '换尿布',
    icon: 'Baby',
    color: 'sage',
    emoji: '🧷'
  },
  weight: {
    type: 'weight',
    label: '体重',
    icon: 'Scale',
    color: 'dusk',
    emoji: '⚖️'
  },
  jaundice: {
    type: 'jaundice',
    label: '黄疸',
    icon: 'Sun',
    color: 'amber',
    emoji: '🟡'
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
