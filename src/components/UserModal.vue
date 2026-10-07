<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import type { User, ValidationErrors, UserFormData } from '@/types/user'
import { GooglePlacesService } from '@/services/GooglePlacesService'
import type { AddressComponent } from '@/types/google-places'

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  close: [refresh?: boolean]
}>()

const usersStore = useUsersStore()
const isLoading = ref(false)
const error = ref<string | null>(null)
const useGooglePlaces = ref(false)
const googlePlacesService = GooglePlacesService.getInstance()

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || ''

const formData = reactive<UserFormData>({
  name: '',
  username: '',
  email: '',
  phone: '',
  website: '',
  address: {
    street: '',
    suite: '',
    city: '',
    zipcode: '',
    geo: {
      lat: '',
      lng: '',
    },
  },
  company: {
    name: '',
    catchPhrase: '',
    bs: '',
  },
})

const validationErrors = ref<ValidationErrors>({})

const isEditMode = computed(() => !!props.user)
const modalTitle = computed(() => (isEditMode.value ? 'Edit User' : 'New User Info'))

watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      formData.name = newUser.name
      formData.username = newUser.username
      formData.email = newUser.email
      formData.phone = newUser.phone
      formData.website = newUser.website

      formData.address = {
        street: newUser.address.street || '',
        suite: newUser.address.suite || '',
        city: newUser.address.city || '',
        zipcode: newUser.address.zipcode || '',
        geo: {
          lat: newUser.address.geo?.lat || '',
          lng: newUser.address.geo?.lng || '',
        },
      }

      formData.company = { ...newUser.company }

      if (newUser.address?.geo?.lat || newUser.address?.geo?.lng) {
        useGooglePlaces.value = true
      }
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    await googlePlacesService.init(GOOGLE_PLACES_API_KEY)
  } catch (err) {
    console.error('Failed to initialize Google Places API:', err)
  }
})

function resetForm() {
  formData.name = ''
  formData.username = ''
  formData.email = ''
  formData.phone = ''
  formData.website = ''
  formData.address = {
    street: '',
    suite: '',
    city: '',
    zipcode: '',
    geo: { lat: '', lng: '' },
  }
  formData.company = {
    name: '',
    catchPhrase: '',
    bs: '',
  }
  validationErrors.value = {}
  useGooglePlaces.value = false
}

function toggleGooglePlaces() {
  if (!useGooglePlaces.value) {
    if (!formData.address.geo) {
      formData.address.geo = { lat: '', lng: '' }
    } else {
      formData.address.geo.lat = ''
      formData.address.geo.lng = ''
    }
  }
}

function handlePlaceChange(event: Event) {
  if (!googlePlacesService.isApiLoaded()) {
    console.error('Google Maps API is not loaded yet')
    return
  }

  const input = event.target as HTMLInputElement
  const autocomplete = new window.google.maps.places.Autocomplete(input)

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace()

    if (!place.geometry || !place.geometry.location) {
      console.error('No details available for this place')
      return
    }

    formData.address.street = place.formatted_address || ''

    if (place.address_components) {
      place.address_components.forEach((component: AddressComponent) => {
        const types = component.types

        if (types.includes('locality') || types.includes('postal_town')) {
          formData.address.city = component.long_name || ''
        } else if (types.includes('postal_code')) {
          formData.address.zipcode = component.long_name || ''
        } else if (types.includes('subpremise')) {
          formData.address.suite = component.long_name || ''
        }
      })
    }

    if (formData.address.geo) {
      formData.address.geo.lat = place.geometry.location.lat().toString()
      formData.address.geo.lng = place.geometry.location.lng().toString()

      console.log('Place selected:', place.formatted_address)
      console.log('Lat/Lng:', formData.address.geo.lat, formData.address.geo.lng)
    }
  })
}

function validateForm(): boolean {
  const errors: ValidationErrors = {}

  if (!formData.name.trim()) {
    errors.name = ['Full Name is required']
  }

  if (!formData.username.trim()) {
    errors.username = ['Username is required']
  }

  if (!formData.email.trim()) {
    errors.email = ['Email is required']
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = ['Invalid email format']
  }

  if (!formData.phone.trim()) {
    errors.phone = ['Phone Nr is required']
  } else if (!/^\+?[0-9\s\-()]+$/.test(formData.phone)) {
    errors.phone = ['Invalid phone number']
  }

  if (!formData.address.street.trim()) {
    errors.street = ['Address is required']
  }

  if (!formData.address.city.trim()) {
    errors.city = ['City is required']
  }

  if (!formData.address.zipcode.trim()) {
    errors.zipcode = ['Zip Code is required']
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitForm() {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  error.value = null

  try {
    if (isEditMode.value && props.user) {
      await usersStore.updateUser(props.user.id, formData)
    } else {
      await usersStore.createUser(formData)
    }

    emit('close', true)
  } catch (err) {
    console.error(`Failed to ${isEditMode.value ? 'update' : 'create'} user:`, err)
  } finally {
    isLoading.value = false
  }
}

function closeModal() {
  emit('close')
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ modalTitle }}</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <div v-if="error" class="error-message">{{ error }}</div>

        <form @submit.prevent="submitForm">
          <div class="form-row">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                :class="{ 'has-error': validationErrors.name }"
                placeholder="Full Name"
              />
              <div v-if="validationErrors.name" class="error-text">
                {{ validationErrors.name[0] }}
              </div>
            </div>

            <div class="form-group">
              <div class="address-label-container">
                <label for="street">Address</label>
                <div class="checkbox-container google-location-toggle">
                  <input
                    id="useGooglePlaces"
                    v-model="useGooglePlaces"
                    type="checkbox"
                    @change="toggleGooglePlaces"
                  />
                  <label for="useGooglePlaces">Use Google Location</label>
                </div>
              </div>
              <div class="address-input-container">
                <input
                  id="street"
                  v-model="formData.address.street"
                  type="text"
                  :class="{ 'has-error': validationErrors.street }"
                  placeholder="Street address"
                  @focus="useGooglePlaces ? handlePlaceChange($event) : null"
                />
              </div>
              <div v-if="validationErrors.street" class="error-text">
                {{ validationErrors.street[0] }}
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="username">Username</label>
              <input
                id="username"
                v-model="formData.username"
                type="text"
                :class="{ 'has-error': validationErrors.username }"
                placeholder="Username"
              />
              <div v-if="validationErrors.username" class="error-text">
                {{ validationErrors.username[0] }}
              </div>
            </div>

            <div class="form-group">
              <label for="city">City</label>
              <input
                id="city"
                v-model="formData.address.city"
                type="text"
                :class="{ 'has-error': validationErrors.city }"
                placeholder="City"
              />
              <div v-if="validationErrors.city" class="error-text">
                {{ validationErrors.city[0] }}
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                :class="{ 'has-error': validationErrors.email }"
                placeholder="Email address"
              />
              <div v-if="validationErrors.email" class="error-text">
                {{ validationErrors.email[0] }}
              </div>
            </div>

            <div class="form-group">
              <label for="zipcode">Zip Code</label>
              <input
                id="zipcode"
                v-model="formData.address.zipcode"
                type="text"
                :class="{ 'has-error': validationErrors.zipcode }"
                placeholder="ZIP code"
              />
              <div v-if="validationErrors.zipcode" class="error-text">
                {{ validationErrors.zipcode[0] }}
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone Nr</label>
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                :class="{ 'has-error': validationErrors.phone }"
                placeholder="Phone number"
              />
              <div v-if="validationErrors.phone" class="error-text">
                {{ validationErrors.phone[0] }}
              </div>
            </div>

            <div class="form-group geo-container" v-if="useGooglePlaces">
              <div class="geo-fields-container">
                <div class="geo-field">
                  <label for="latitude">Latitude</label>
                  <input
                    id="latitude"
                    :value="formData.address.geo?.lat || ''"
                    @input="
                      (e) => {
                        if (!formData.address.geo) formData.address.geo = { lat: '', lng: '' }
                        formData.address.geo.lat = (e.target as HTMLInputElement).value
                      }
                    "
                    type="text"
                    placeholder="Latitude"
                    readonly
                  />
                </div>

                <div class="geo-field">
                  <label for="longitude">Longitude</label>
                  <input
                    id="longitude"
                    :value="formData.address.geo?.lng || ''"
                    @input="
                      (e) => {
                        if (!formData.address.geo) formData.address.geo = { lat: '', lng: '' }
                        formData.address.geo.lng = (e.target as HTMLInputElement).value
                      }
                    "
                    type="text"
                    placeholder="Longitude"
                    readonly
                  />
                </div>
              </div>
            </div>

            <div class="form-group" v-if="!useGooglePlaces"></div>

            <div class="form-group hidden-field">
              <input
                id="suite"
                v-model="formData.address.suite"
                type="hidden"
                placeholder="Apartment, suite, etc."
              />
            </div>
          </div>

          <div class="form-group hidden-field">
            <input
              id="website"
              v-model="formData.website"
              type="hidden"
              :class="{ 'has-error': validationErrors.website }"
              placeholder="Website URL"
            />
          </div>

          <div class="form-group hidden-field">
            <input
              id="companyName"
              v-model="formData.company.name"
              type="hidden"
              :class="{ 'has-error': validationErrors.companyName }"
              placeholder="Company name"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-button" @click="closeModal">Cancel</button>
            <button type="submit" class="submit-button" :disabled="isLoading">
              {{ isLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: var(--border-radius);
  width: 95%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
}

.modal-body {
  padding: 1rem;
}

.error-message {
  background: #fee2e2;
  color: var(--color-error);
  padding: 0.75rem;
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
}

.address-label-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.google-location-toggle {
  margin: 0;
  font-size: 0.875rem;
}

.form-row {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 1rem;
}

.hidden-field {
  display: none;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

input,
gmpx-place-picker {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

input:focus,
gmpx-place-picker:focus {
  outline: none;
  border-color: #3c81fc;
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

input.has-error,
gmpx-place-picker.has-error {
  border-color: #ef4444;
}

.error-text {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.checkbox-container {
  display: flex;
  align-items: center;
}

.checkbox-container input[type='checkbox'] {
  margin-right: 0.5rem;
  width: 1rem;
  height: 1rem;
}

.address-input-container {
  position: relative;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cancel-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: white;
  font-weight: 500;
}

.submit-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background: var(--color-primary);
  color: white;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.geo-container {
  position: relative;
}

.geo-fields-container {
  display: flex;
  gap: 0.75rem;
}

.geo-field {
  flex: 1;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .modal-container {
    width: 100%;
    max-height: 100%;
    border-radius: 0;
  }

  .modal-overlay {
    align-items: flex-start;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .cancel-button,
  .submit-button {
    width: 100%;
    justify-content: center;
  }

  .geo-fields-container {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
