// 通用工具
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export { dayjs }

// 时间格式
export function fmtTime(iso: string): string {
  return dayjs(iso).format('HH:mm')
}

export function fmtDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD')
}

export function fmtDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

export function fmtRelative(iso: string): string {
  return dayjs(iso).fromNow()
}

// 年龄
export function ageOf(birthday: string): string {
  const d = dayjs(birthday)
  const now = dayjs()
  const months = now.diff(d, 'month')
  if (months < 1) {
    const days = now.diff(d, 'day')
    return `${days} 天`
  }
  if (months < 24) return `${months} 月`
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  return restMonths > 0 ? `${years} 岁 ${restMonths} 月` : `${years} 岁`
}

// 出生至今天数
export function daysOld(birthday: string): number {
  return dayjs().diff(dayjs(birthday), 'day')
}

// 时长格式化
export function fmtDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} 分钟`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`
}

// 文件下载
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 防抖
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300) {
  let timer: any = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}