import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUsersStore } from '@/stores/users'
import type { UserFormData } from '@/types/user'

describe('user requests', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.unstubAllGlobals())

  it('loads users from a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1, name: 'Ada' }]))))
    const store = useUsersStore()
    await store.fetchUsers()
    expect(store.getUserById(1)?.name).toBe('Ada')
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('reports an unsuccessful response without treating it as user data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })))
    const store = useUsersStore()
    await store.fetchUsers()
    expect(store.users).toEqual([])
    expect(store.error).toContain('503')
    expect(store.loading).toBe(false)
  })

  it('does not delete local records if the remote operation fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1, name: 'Ada' }])))
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    const store = useUsersStore()
    await store.fetchUsers()
    await expect(store.deleteUser(1)).rejects.toContain('403')
    expect(store.getUserById(1)?.name).toBe('Ada')
  })

  it('sends user values as JSON rather than executable markup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const store = useUsersStore()
    const input = { name: '<img src=x onerror=alert(1)>' } as UserFormData
    await store.createUser(input)
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    }))
  })
})
