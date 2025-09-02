<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import L, { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

delete (L.Icon.Default.prototype as any)._getIconUrl // A small hack to make Leaflet re-evaluate icon paths

L.Icon.Default.mergeOptions({
  iconUrl: '/images/marker-icon.png', // Path relative to the public folder
  iconRetinaUrl: '/images/marker-icon-2x.png', // Path relative to the public folder
  shadowUrl: '/images/marker-shadow.png', // Path relative to the public folder
})

const { t, locale } = useI18n()

interface GeoapifyProperties {
  name?: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postcode: string
  country: string
  lat: number
  lon: number
  distance: number
  place_id: string
}

interface PlaceFeature {
  type: 'Feature'
  properties: GeoapifyProperties
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

// Updated interface to match the autocomplete API response structure
interface AutocompleteFeature {
  address_line1: string
  address_line2: string
  place_id: string
  bbox: {
    lon1: number
    lat1: number
    lon2: number
    lat2: number
  }
}

// --- API and Constants ---
const GEOAPIFY_API_KEY = 'dae1066da9ad4cb6a067f90f593e9f58'

// Helper function to get the language code for the API
const getLanguageForAPI = (): 'en' | 'zh' | 'ms' => {
  const userLocale = localStorage.getItem('user-locale')

  if (!userLocale) {
    return 'en' // Default to English if not set
  }

  // Map localStorage value to API value
  if (userLocale.startsWith('zh')) {
    // Handles 'zh-CN', 'zh-TW', etc.
    return 'zh'
  }
  if (userLocale === 'ms') {
    return 'ms'
  }

  // Fallback to 'en' for 'en' or any other unexpected values
  return 'en'
}

const CHILDCARE_CATEGORIES = [
  'childcare',
  'childcare.kindergarten',
  'education.school',
  'education.music_school',
  'education.language_school',
  'leisure.playground',
  'entertainment.activity_park',
  'entertainment.activity_park.trampoline',
  'entertainment.activity_park.climbing',
  'healthcare.clinic_or_praxis.paediatrics',
  'healthcare.hospital',
  'leisure.picnic.bbq',
  'leisure.picnic.picnic_site',
  'leisure.picnic.picnic_table',
].join(',')

// --- Reactive State ---
const facilityNameQuery = ref('')
const searchFilter = ref('radius')
const radiusInMeters = ref(500)
const places = ref<PlaceFeature[]>([])
const isLoading = ref(true)
const errorMsg = ref<string | null>(null)

// Combobox/Autocomplete State for Location
const locationInputQuery = ref('')
const autocompleteSuggestions = ref<AutocompleteFeature[]>([])
const selectedLocation = ref<AutocompleteFeature | null>(null)

// State for the details sheet
const selectedPlaceForSheet = ref<PlaceFeature | null>(null)
const isSheetOpen = ref(false)

// --- Map State ---
let map: L.Map | null = null
const defaultCenter: LatLngExpression = [3.139, 101.6869]
let circleLayer: L.Circle | null = null
let boundaryLayer: L.Rectangle | null = null
let markerLayer: L.LayerGroup | null = null

// --- Filter Options (now computed for i18n) ---
const filterOptions = computed(() => [
  { value: 'radius', label: t('mapPage.filterOptions.radius') },
  { value: 'location', label: t('mapPage.filterOptions.location') },
])

// --- Computed Properties ---
const currentFilterLabel = computed(() => {
  return (
    filterOptions.value.find((option) => option.value === searchFilter.value)?.label ??
    t('mapPage.filterBy')
  )
})
const showLocationCombobox = computed(() => searchFilter.value === 'location')

// --- API Call Logic ---
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const debounce = (func: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

const fetchAutocompleteSuggestions = debounce(async (query: string) => {
  if (query.length < 1) {
    autocompleteSuggestions.value = []
    return
  }
  const lang = getLanguageForAPI()
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&type=locality&filter=countrycode:my&format=json&apiKey=${GEOAPIFY_API_KEY}&lang=${lang}`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Network response was not ok')
    const data = await response.json()
    autocompleteSuggestions.value = data.results || []
  } catch (err) {
    console.error('Autocomplete fetch error:', err)
    autocompleteSuggestions.value = []
  }
}, 300)

watch(locationInputQuery, (newQuery) => {
  if (!newQuery) {
    selectedLocation.value = null
  }

  // This guard prevents re-fetching when a location is selected
  if (selectedLocation.value && newQuery === selectedLocation.value.address_line1) {
    autocompleteSuggestions.value = [] // Also clear suggestions here
    return
  }

  fetchAutocompleteSuggestions(newQuery)
})

const searchPlaces = async (params: URLSearchParams) => {
  isLoading.value = true
  errorMsg.value = null
  places.value = []

  const baseUrl = `https://api.geoapify.com/v2/places`
  const placesUrl = `${baseUrl}?${params.toString()}`

  try {
    const placesResponse = await fetch(placesUrl)
    if (!placesResponse.ok) {
      const errorData = await placesResponse.json()
      throw new Error(
        `Places API error: ${placesResponse.status} ${placesResponse.statusText} - ${errorData.message}`,
      )
    }
    const placesData = await placesResponse.json()
    places.value = (placesData.features ?? [])
      .filter((place: PlaceFeature) => place.properties.name) // REQUIREMENT 1: Filter out places without a name
      .sort((a: PlaceFeature, b: PlaceFeature) => a.properties.distance - b.properties.distance)
    updateMapMarkers()
  } catch (err) {
    errorMsg.value = t('mapPage.errors.couldNotFind') // Translated error
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// --- Event Handlers ---
const handleSearch = () => {
  const lang = getLanguageForAPI()
  const params = new URLSearchParams({
    categories: CHILDCARE_CATEGORIES,
    limit: '200',
    apiKey: GEOAPIFY_API_KEY,
    lang,
  })

  if (facilityNameQuery.value.trim()) {
    params.set('name', facilityNameQuery.value.trim())
  }

  if (searchFilter.value === 'radius') {
    if (!map) return
    const center = circleLayer ? circleLayer.getLatLng() : map.getCenter()
    const radius = radiusInMeters.value > 0 ? radiusInMeters.value : 5000
    params.set('filter', `circle:${center.lng},${center.lat},${radius}`)
    params.set('bias', `proximity:${center.lng},${center.lat}`)
    updateCircle(center.lat, center.lng, radius)
    searchPlaces(params)
  } else if (searchFilter.value === 'location') {
    if (!selectedLocation.value) {
      errorMsg.value = t('mapPage.errors.selectLocation') // Translated error
      return
    }
    const placeId = selectedLocation.value.place_id
    params.set('filter', `place:${placeId}`)
    updateBoundary(selectedLocation.value.bbox)
    searchPlaces(params)
  }
}

const fetchPlacesByCircle = async (lat: number, lon: number, radius: number) => {
  searchFilter.value = 'radius'
  facilityNameQuery.value = ''
  selectedLocation.value = null
  radiusInMeters.value = radius

  isLoading.value = true
  errorMsg.value = null
  if (boundaryLayer && map) map.removeLayer(boundaryLayer)

  const lang = getLanguageForAPI()
  const params = new URLSearchParams({
    categories: CHILDCARE_CATEGORIES,
    filter: `circle:${lon},${lat},${radius}`,
    limit: '200',
    apiKey: GEOAPIFY_API_KEY,
    lang,
  })

  params.set('bias', `proximity:${lon},${lat}`)

  await searchPlaces(params)
  updateCircle(lat, lon, radius)
  if (map) map.setView([lat, lon], 15)
}

// Function to open the details sheet
const openPlaceDetails = (place: PlaceFeature) => {
  selectedPlaceForSheet.value = place
  isSheetOpen.value = true
}

const increaseRadius = () => {
  radiusInMeters.value += 500
  handleSearch()
}

const decreaseRadius = () => {
  radiusInMeters.value = Math.max(500, radiusInMeters.value - 500) // 不允许小于500
  handleSearch()
}

// --- Map Functions ---
const initializeMap = () => {
  map = L.map('map-container', {
    // Optional: You can also disable it during initialization
    // attributionControl: false
  }).setView(defaultCenter, 13)

  // This is the cleanest way to remove the "Leaflet" link while keeping layer attributions.
  if (map.attributionControl) {
    map.attributionControl.setPrefix(false)
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      'Cita-Cita | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)

  map.on('click', (e: L.LeafletMouseEvent) =>
    fetchPlacesByCircle(e.latlng.lat, e.latlng.lng, radiusInMeters.value),
  )
}

const updateMapMarkers = () => {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  const unnamed = t('mapPage.unnamedFacility') // Get translation
  places.value.forEach((place) => {
    const { lat, lon, name, address_line2 } = place.properties
    L.marker([lat, lon])
      .addTo(markerLayer!)
      .bindPopup(`<b>${name ?? unnamed}</b><br>${address_line2}`) // Use translation
  })
}

const updateCircle = (lat: number, lon: number, radius: number) => {
  if (!map) return
  if (circleLayer) map.removeLayer(circleLayer)
  if (boundaryLayer) {
    map.removeLayer(boundaryLayer)
    boundaryLayer = null
  }
  circleLayer = L.circle([lat, lon], {
    radius,
    color: '#1d4ed8',
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
  }).addTo(map)
}

const updateBoundary = (bbox: AutocompleteFeature['bbox']) => {
  if (!map || !bbox) return
  if (boundaryLayer) map.removeLayer(boundaryLayer)
  if (circleLayer) {
    map.removeLayer(circleLayer)
    circleLayer = null
  }
  const bounds = L.latLngBounds([bbox.lat1, bbox.lon1], [bbox.lat2, bbox.lon2])
  boundaryLayer = L.rectangle(bounds, {
    color: '#ef4444',
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.1,
  }).addTo(map)
  map.fitBounds(boundaryLayer.getBounds())
}

// --- Lifecycle & Watchers ---
onMounted(() => {
  initializeMap()
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchPlacesByCircle(pos.coords.latitude, pos.coords.longitude, 500),
      () => fetchPlacesByCircle(defaultCenter[0], defaultCenter[1], 500),
    )
  } else {
    fetchPlacesByCircle(defaultCenter[0], defaultCenter[1], 500)
  }
})

watch(searchFilter, () => {
  selectedLocation.value = null
})

// 监听语言变化并重新触发搜索
watch(locale, (newLocale, oldLocale) => {
  if (newLocale && oldLocale && newLocale !== oldLocale) {
    handleSearch()
    autocompleteSuggestions.value = []
  }
})
</script>

<template>
  <div class="bg-black/70 h-full flex flex-col space-y-4 pt-4 pb-2">
    <div class="text-center text-white text-4xl font-bold">{{ t('mapPage.title') }}</div>
    <div class="text-center text-white text-2xl">
      {{ t('mapPage.subtitle') }}
    </div>

    <div class="w-full flex-1 flex text-white gap-2 overflow-hidden">
      <div class="w-1/4 bg-[#243845] p-4 flex flex-col gap-4">
        <div class="text-4xl">{{ t('mapPage.searchTitle') }}</div>

        <div class="flex flex-col gap-3">
          <div class="bg-white text-black">
            <Input
              v-model="facilityNameQuery"
              type="text"
              :placeholder="t('mapPage.facilityNamePlaceholder')"
              class="h-full text-4xl w-full focus-visible:ring-0 border-none"
              @keyup.enter="handleSearch"
            />
          </div>

          <div class="bg-white text-black w-fit">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  class="flex items-center justify-between px-3 text-black hover:bg-black/10 focus-visible:ring-0"
                >
                  <span>{{ currentFilterLabel }}</span>
                  <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56">
                <DropdownMenuLabel>{{ t('mapPage.filterBy') }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup v-model="searchFilter">
                  <DropdownMenuRadioItem
                    v-for="option in filterOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div class="flex items-center bg-white text-black">
            <div class="flex-1">
              <Combobox
                v-if="showLocationCombobox"
                v-model="selectedLocation"
                by="place_id"
                class="w-full"
              >
                <ComboboxAnchor class="w-full">
                  <div class="relative w-full items-center">
                    <ComboboxInput
                      class="pr-10 h-full w-full focus-visible:ring-0 border-none"
                      :placeholder="t('mapPage.locationPlaceholder')"
                      :display-value="(loc: any) => loc?.address_line1"
                      @update:model-value="(query) => (locationInputQuery = query)"
                    />
                    <ComboboxTrigger
                      class="absolute end-0 inset-y-0 flex items-center justify-center px-2"
                    >
                      <ChevronsUpDown class="size-4 text-muted-foreground" />
                    </ComboboxTrigger>
                  </div>
                </ComboboxAnchor>

                <ComboboxList class="bg-white text-black p-0">
                  <ComboboxEmpty class="p-4 text-center text-lg"
                    >{{ t('mapPage.noLocationFound') }}
                  </ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="suggestion in autocompleteSuggestions"
                      :key="suggestion.place_id"
                      :value="suggestion"
                      class="p-2 text-lg hover:bg-gray-100 cursor-pointer"
                    >
                      {{ suggestion.address_line1 }}, {{ suggestion.address_line2 }}
                      <ComboboxItemIndicator>
                        <Check class="ml-auto h-4 w-4" />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </Combobox>
              <div v-else class="flex items-center w-full">
                <Button
                  variant="ghost"
                  class="px-3 hover:bg-black/10 rounded-r-none"
                  @click="decreaseRadius"
                >
                  -
                </Button>
                <Input
                  v-model="radiusInMeters"
                  inputmode="numeric"
                  type="text"
                  placeholder="Radius"
                  class="h-full text-lg w-full focus-visible:ring-0 border-x-0 border-y-0 rounded-none text-center no-spinner"
                  @keyup.enter="handleSearch"
                  @input="
                    (e: any) => {
                      const val = Number(e.target.value)
                      radiusInMeters = isNaN(val) || val <= 0 ? 500 : val
                    }
                  "
                  @blur="
                    () => {
                      if (!radiusInMeters || radiusInMeters <= 0) {
                        radiusInMeters = 500
                      }
                    }
                  "
                />

                <Button
                  variant="ghost"
                  class="px-3 hover:bg-black/10 rounded-l-none"
                  @click="increaseRadius"
                >
                  +
                </Button>
                <span class="text-lg text-gray-500 pr-3 pl-2">{{ t('mapPage.radiusUnit') }}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              class="flex items-center justify-center p-3 cursor-pointer hover:bg-black/10 rounded-none"
              @click="handleSearch"
            >
              <Search class="size-6 text-black" />
            </Button>
          </div>
        </div>

        <ScrollArea class="flex-1 min-h-0 pe-3">
          <div v-if="isLoading" class="text-center text-xl mt-10">{{ t('mapPage.loading') }}</div>
          <div v-else-if="errorMsg" class="text-center text-red-400 text-xl mt-10">
            {{ errorMsg }}
          </div>
          <div v-else-if="places.length === 0" class="text-center text-xl mt-10">
            {{ t('mapPage.noFacilitiesFound') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="place in places"
              :key="place.properties.place_id"
              class="p-4 bg-white text-black text-lg font-semibold rounded-lg cursor-pointer transition-colors hover:bg-gray-200"
              @click="openPlaceDetails(place)"
            >
              <p class="text-xl font-bold truncate">
                {{ place.properties.name ?? t('mapPage.unnamedFacility') }}
              </p>
              <p class="font-sans text-lg text-gray-600 truncate">
                {{ place.properties.address_line2 }}
              </p>
              <p v-if="place.properties.distance" class="font-sans text-base text-blue-700">
                {{ (place.properties.distance / 1000).toFixed(2) }} {{ t('mapPage.distanceAway') }}
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div id="map-container" class="w-3/4 h-full z-10"></div>
    </div>

    <Sheet v-model:open="isSheetOpen" class="z-50">
      <SheetContent side="left" class="w-full sm:max-w-lg bg-white text-black overflow-y-auto">
        <SheetHeader class="mb-4">
          <SheetTitle class="text-3xl font-bold break-words">
            {{ selectedPlaceForSheet?.properties.name ?? t('mapPage.unnamedFacility') }}
          </SheetTitle>
          <SheetDescription class="text-base">
            {{ t('mapPage.details.title') }}
          </SheetDescription>
        </SheetHeader>
        <div v-if="selectedPlaceForSheet" class="space-y-3 mx-4 text-lg">
          <div>
            <p class="font-semibold text-gray-500">{{ t('mapPage.details.address') }}</p>
            <p>{{ selectedPlaceForSheet.properties.address_line1 }}</p>
            <p>{{ selectedPlaceForSheet.properties.address_line2 }}</p>
          </div>
          <div>
            <p class="font-semibold text-gray-500">{{ t('mapPage.details.city') }}</p>
            <p>{{ selectedPlaceForSheet.properties.city }}</p>
          </div>
          <div>
            <p class="font-semibold text-gray-500">{{ t('mapPage.details.state') }}</p>
            <p>{{ selectedPlaceForSheet.properties.state }}</p>
          </div>
          <div>
            <p class="font-semibold text-gray-500">{{ t('mapPage.details.postcode') }}</p>
            <p>{{ selectedPlaceForSheet.properties.postcode }}</p>
          </div>
          <div v-if="selectedPlaceForSheet.properties.distance">
            <p class="font-semibold text-gray-500">{{ t('mapPage.details.distance') }}</p>
            <p class="text-blue-700 font-bold">
              {{ (selectedPlaceForSheet.properties.distance / 1000).toFixed(2) }}
              {{ t('mapPage.distanceAway') }}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>

<style scoped>
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spinner {
  -moz-appearance: textfield; /* Firefox */
}
</style>
