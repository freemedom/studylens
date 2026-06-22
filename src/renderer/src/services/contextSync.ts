import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SYNC_LOCAL_UPDATED_AT_KEY,
  SYNC_TOKEN_STORAGE_KEY
} from '../constants/thresholds'
import type { ContextRule, StudyMode } from '../types/context'

const TABLE = 'context_sync'

type RemoteRow = {
  sync_token: string
  rules: unknown
  updated_at: number
}

export type SyncApplyResult =
  | { action: 'pulled'; rules: ContextRule[]; updatedAt: number }
  | { action: 'pushed'; updatedAt: number }
  | { action: 'noop' }
  | { action: 'conflict' }
  | { action: 'error'; message: string }

let client: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  client = createClient(url, key)
  return client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function maskSyncToken(token: string): string {
  if (token.length <= 10) return token
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

export function getSyncToken(): string | null {
  return localStorage.getItem(SYNC_TOKEN_STORAGE_KEY)
}

export function saveSyncToken(token: string): void {
  localStorage.setItem(SYNC_TOKEN_STORAGE_KEY, token.trim())
}

export function clearSyncToken(): void {
  localStorage.removeItem(SYNC_TOKEN_STORAGE_KEY)
}

export function getLocalUpdatedAt(): number {
  const raw = localStorage.getItem(SYNC_LOCAL_UPDATED_AT_KEY)
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function bumpLocalUpdatedAt(now = Date.now()): number {
  localStorage.setItem(SYNC_LOCAL_UPDATED_AT_KEY, String(now))
  return now
}

export function setLocalUpdatedAt(value: number): void {
  localStorage.setItem(SYNC_LOCAL_UPDATED_AT_KEY, String(value))
}

function isStudyMode(value: unknown): value is StudyMode {
  return value === 'strict' || value === 'study' || value === 'relax'
}

export function parseContextRules(raw: unknown): ContextRule[] | null {
  if (!Array.isArray(raw)) return null
  const rules: ContextRule[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'string' || !isStudyMode(record.mode)) return null
    const label = typeof record.label === 'string' ? record.label : undefined
    const createdAt = typeof record.createdAt === 'number' ? record.createdAt : undefined
    if (record.kind === 'wifi') {
      if (typeof record.ssid !== 'string') return null
      rules.push({ id: record.id, kind: 'wifi', ssid: record.ssid, mode: record.mode, label, createdAt })
      continue
    }
    if (record.kind === 'location') {
      if (
        typeof record.lat !== 'number' ||
        typeof record.lng !== 'number' ||
        typeof record.radiusM !== 'number'
      ) {
        return null
      }
      rules.push({
        id: record.id,
        kind: 'location',
        lat: record.lat,
        lng: record.lng,
        radiusM: record.radiusM,
        mode: record.mode,
        label,
        createdAt
      })
      continue
    }
    return null
  }
  return rules
}

function createSyncToken(): string {
  return crypto.randomUUID()
}

async function fetchRemoteRow(token: string): Promise<RemoteRow | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('sync_token, rules, updated_at')
    .eq('sync_token', token)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return data as RemoteRow
}

export async function createSyncGroup(
  rules: ContextRule[]
): Promise<{ token: string } | { error: string }> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'Supabase 未配置' }
  const token = createSyncToken()
  const updatedAt = bumpLocalUpdatedAt()
  const { error } = await supabase.from(TABLE).upsert({
    sync_token: token,
    rules,
    updated_at: updatedAt
  })
  if (error) return { error: error.message }
  saveSyncToken(token)
  return { token }
}

export async function joinSyncGroup(
  token: string
): Promise<{ ok: true } | { error: string }> {
  const trimmed = token.trim()
  if (!trimmed) return { error: '请输入同步码' }
  const supabase = getSupabase()
  if (!supabase) return { error: 'Supabase 未配置' }
  try {
    const remote = await fetchRemoteRow(trimmed)
    if (!remote) return { error: '同步码无效或不存在' }
    saveSyncToken(trimmed)
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '加入同步失败' }
  }
}

export async function pullRules(): Promise<SyncApplyResult> {
  const token = getSyncToken()
  if (!token) return { action: 'noop' }
  const supabase = getSupabase()
  if (!supabase) return { action: 'error', message: 'Supabase 未配置' }
  try {
    const remote = await fetchRemoteRow(token)
    if (!remote) return { action: 'error', message: '云端同步组不存在' }
    const localUpdatedAt = getLocalUpdatedAt()
    if (remote.updated_at <= localUpdatedAt) return { action: 'noop' }
    const rules = parseContextRules(remote.rules)
    if (!rules) return { action: 'error', message: '云端规则格式无效' }
    setLocalUpdatedAt(remote.updated_at)
    return { action: 'pulled', rules, updatedAt: remote.updated_at }
  } catch (err) {
    return { action: 'error', message: err instanceof Error ? err.message : '拉取失败' }
  }
}

export async function pushRules(rules: ContextRule[]): Promise<SyncApplyResult> {
  const token = getSyncToken()
  if (!token) return { action: 'noop' }
  const supabase = getSupabase()
  if (!supabase) return { action: 'error', message: 'Supabase 未配置' }
  try {
    const remote = await fetchRemoteRow(token)
    const localUpdatedAt = getLocalUpdatedAt()
    if (remote && remote.updated_at > localUpdatedAt) {
      return { action: 'conflict' }
    }
    const updatedAt = bumpLocalUpdatedAt()
    const { error } = await supabase.from(TABLE).upsert({
      sync_token: token,
      rules,
      updated_at: updatedAt
    })
    if (error) return { action: 'error', message: error.message }
    return { action: 'pushed', updatedAt }
  } catch (err) {
    return { action: 'error', message: err instanceof Error ? err.message : '推送失败' }
  }
}

export async function syncRules(localRules: ContextRule[]): Promise<SyncApplyResult> {
  const pulled = await pullRules()
  if (pulled.action === 'pulled') return pulled
  if (pulled.action === 'error') return pulled
  return pushRules(localRules)
}
