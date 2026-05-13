import { createClient } from './supabase/server'

export function makeTableCRUD(table: string, tag: string) {
  async function insert<T extends object>(data: T): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { console.error(`[${tag}] no authenticated user`); return null }
    const { data: result, error } = await supabase
      .from(table)
      .insert({ ...data, user_id: user.id })
      .select('id')
      .single()
    if (error) { console.error(`[${tag}] insert:`, error); return null }
    return result?.id ?? null
  }

  async function update<T extends object>(id: string, patch: T): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) { console.error(`[${tag}] update:`, error); return false }
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { console.error(`[${tag}] delete:`, error); return false }
    return true
  }

  return { insert, update, remove }
}
