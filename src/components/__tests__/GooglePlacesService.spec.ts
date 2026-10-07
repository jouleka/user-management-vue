import { expect, it } from 'vitest'
import { GooglePlacesService } from '@/services/GooglePlacesService'

it('keeps a configured key from injecting Maps script query parameters', async () => {
  const key = 'test-key&callback=unexpected#fragment'
  const service = GooglePlacesService.getInstance()
  const loading = service.init(key)
  const script = document.head.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com"]')!
  const url = new URL(script.src)
  expect(url.searchParams.get('key')).toBe(key)
  expect(url.searchParams.getAll('callback')).toEqual(['initGoogleMaps'])
  expect(url.hash).toBe('')
  window.initGoogleMaps()
  expect(await loading).toBe(true)
  script.remove()
})
