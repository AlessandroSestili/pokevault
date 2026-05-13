import { revalidatePath } from 'next/cache'

export async function runAndRevalidate<T>(fn: () => Promise<T>, path = '/'): Promise<T> {
  const result = await fn()
  revalidatePath(path)
  return result
}
