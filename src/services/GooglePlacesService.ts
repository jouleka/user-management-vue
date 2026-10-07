export class GooglePlacesService {
  private static instance: GooglePlacesService
  private apiKey: string = ''
  private isLoaded: boolean = false
  private loadingPromise: Promise<boolean> | null = null

  private constructor() {}

  public static getInstance(): GooglePlacesService {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService()
    }
    return GooglePlacesService.instance
  }

  public async init(apiKey: string): Promise<boolean> {
    if (this.isLoaded && this.apiKey === apiKey) {
      return true
    }

    this.apiKey = apiKey

    if (!this.loadingPromise) {
      this.loadingPromise = new Promise<boolean>((resolve, reject) => {
        try {
          const loader = () => {
            const script = document.createElement('script')
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=initGoogleMaps&loading=async`
            script.defer = true

            window.initGoogleMaps = () => {
              console.log('Google Maps JavaScript API loaded successfully')
              this.isLoaded = true
              resolve(true)
            }

            script.onerror = (error) => {
              console.error('Failed to load Google Maps JavaScript API:', error)
              reject(new Error('Failed to load Google Maps JavaScript API'))
            }

            document.head.appendChild(script)
          }
          loader()
        } catch (error) {
          console.error('Error initializing Google Places service:', error)
          reject(error)
        }
      })
    }

    return this.loadingPromise
  }

  public isApiLoaded(): boolean {
    return this.isLoaded
  }
}

// global type declaration for the callback
declare global {
  interface Window {
    initGoogleMaps: () => void
  }
}
