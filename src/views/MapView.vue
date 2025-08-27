<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import L, { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Shadcn / Lucide Imports
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

// --- TypeScript Interfaces for Type Safety ---
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
const radiusInMeters = ref(5000) // Default radius: 5000m
const places = ref<PlaceFeature[]>([])
const isLoading = ref(true)
const errorMsg = ref<string | null>(null)

// Combobox/Autocomplete State for Location
const locationInputQuery = ref('') // NEW: State for the raw text input
const autocompleteSuggestions = ref<AutocompleteFeature[]>([])
const selectedLocation = ref<AutocompleteFeature | null>(null)

// --- Map State ---
let map: L.Map | null = null
const defaultCenter: LatLngExpression = [3.139, 101.6869]
let circleLayer: L.Circle | null = null
let boundaryLayer: L.GeoJSON | null = null
let markerLayer: L.LayerGroup | null = null

// --- Filter Options ---
const filterOptions = [
  { value: 'radius', label: 'By Radius' },
  { value: 'location', label: 'By Location' },
]

// --- Computed Properties ---
const currentFilterLabel = computed(() => {
  return filterOptions.find((option) => option.value === searchFilter.value)?.label ?? 'Filter'
})
const showLocationCombobox = computed(() => searchFilter.value === 'location')

// --- API Call Logic ---
// Debounce function to limit API calls
const debounce = (func: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

// Autocomplete function remains debounced
const fetchAutocompleteSuggestions = debounce(async (query: string) => {
  if (query.length < 2) {
    autocompleteSuggestions.value = []
    return
  }
  // Added type=locality to refine search for cities/towns
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&type=locality&filter=countrycode:my&format=json&apiKey=${GEOAPIFY_API_KEY}`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Network response was not ok')
    const data = await response.json()
    autocompleteSuggestions.value = data.results || []
  } catch (err) {
    console.error('Autocomplete fetch error:', err)
  }
}, 300) // 300ms delay

// NEW: Watch for changes in the text input and call the debounced fetch function
watch(locationInputQuery, (newQuery) => {
  // If the user has just selected an item, the input will be set to its display value.
  // We don't want to trigger another search in that case.
  if (selectedLocation.value && newQuery === selectedLocation.value.address_line1) {
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
    places.value = (placesData.features ?? []).sort(
      (a: PlaceFeature, b: PlaceFeature) => a.properties.distance - b.properties.distance,
    )
    updateMapMarkers()
  } catch (err) {
    errorMsg.value = `Could not find facilities.`
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// --- Event Handlers ---
const handleSearch = () => {
  const params = new URLSearchParams({
    categories: CHILDCARE_CATEGORIES,
    limit: '500',
    apiKey: GEOAPIFY_API_KEY,
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
      errorMsg.value = 'Please select a location from the list.'
      return
    }
    const placeId = selectedLocation.value.place_id
    params.set('filter', `place:${placeId}`)
    updateBoundary(selectedLocation.value.bbox)
    searchPlaces(params)
  }
}

// MODIFICATION 1: This function now sets the search filter to 'radius'
const fetchPlacesByCircle = async (lat: number, lon: number, radius: number) => {
  searchFilter.value = 'radius' // <-- CHANGE ADDED HERE
  facilityNameQuery.value = ''
  selectedLocation.value = null
  radiusInMeters.value = radius

  isLoading.value = true
  errorMsg.value = null
  if (boundaryLayer && map) map.removeLayer(boundaryLayer)

  const params = new URLSearchParams({
    categories: CHILDCARE_CATEGORIES,
    filter: `circle:${lon},${lat},${radius}`,
    limit: '100',
    apiKey: GEOAPIFY_API_KEY,
  })

  searchPlaces(params)
  updateCircle(lat, lon, radius)
  if (map) map.setView([lat, lon], 15)
}

// --- Map Functions ---
const initializeMap = () => {
  map = L.map('map-container').setView(defaultCenter, 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
  }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)

  // MODIFICATION 2: The map click now uses the reactive radiusInMeters value
  map.on('click', (e: L.LeafletMouseEvent) =>
    fetchPlacesByCircle(e.latlng.lat, e.latlng.lng, radiusInMeters.value),
  ) // <-- CHANGE MADE HERE
}

const updateMapMarkers = () => {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  places.value.forEach((place) => {
    const { lat, lon, name, address_line2 } = place.properties
    L.marker([lat, lon])
      .addTo(markerLayer!)
      .bindPopup(`<b>${name ?? 'Unnamed Facility'}</b><br>${address_line2}`)
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

// --- Lifecycle ---
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
</script>

<template>
  <div class="bg-black/70 h-full flex flex-col">
    <div class="text-center text-white text-6xl">Childcare Facilities Near Me</div>
    <div class="text-center text-white text-4xl">
      Find childcare facilities near your office or home in Malaysia.
    </div>

    <div class="w-full flex-1 flex text-white gap-2 overflow-hidden">
      <div class="w-1/4 bg-[#243845] p-4 flex flex-col gap-4">
        <div class="text-4xl">Search Here:</div>

        <div class="flex flex-col gap-3">
          <div class="bg-white text-black">
            <Input
              v-model="facilityNameQuery"
              type="text"
              placeholder="Enter facility name (optional)"
              class="h-full text-4xl w-full focus-visible:ring-0 border-none"
              @keyup.enter="handleSearch"
            />
          </div>

          <div class="flex items-center bg-white text-black">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  class="flex items-center gap-1 text-black text-xl px-3 hover:bg-black/10 focus-visible:ring-0"
                >
                  {{ currentFilterLabel }}
                  <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56">
                <DropdownMenuLabel>Filter By</DropdownMenuLabel>
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
                      class="pl-3 pr-10 h-full text-xl w-full focus-visible:ring-0 border-none"
                      placeholder="Select location..."
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
                  <ComboboxEmpty class="p-4 text-center text-lg">No location found.</ComboboxEmpty>
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
              <div v-else class="flex items-center">
                <Input
                  v-model="radiusInMeters"
                  type="number"
                  placeholder="Radius"
                  class="h-full text-xl w-full focus-visible:ring-0 border-none"
                />
                <span class="text-xl text-gray-500 pr-3">meters</span>
              </div>
            </div>

            <span
              class="flex items-center justify-center px-4 cursor-pointer"
              @click="handleSearch"
            >
              <Search class="size-8 text-black" />
            </span>
          </div>
        </div>

        <ScrollArea class="h-full pe-3">
          <div v-if="isLoading" class="text-center text-2xl mt-10">Loading...</div>
          <div v-else-if="errorMsg" class="text-center text-red-400 text-2xl mt-10">
            {{ errorMsg }}
          </div>
          <div v-else-if="places.length === 0" class="text-center text-2xl mt-10">
            No facilities found.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="place in places"
              :key="place.properties.place_id"
              class="p-4 bg-white text-black text-xl font-semibold rounded-lg"
            >
              <p class="text-2xl font-bold truncate">
                {{ place.properties.name ?? 'Unnamed Facility' }}
              </p>
              <p class="font-sans text-lg text-gray-600 truncate">
                {{ place.properties.address_line2 }}
              </p>
              <p v-if="place.properties.distance" class="font-sans text-base text-blue-700">
                {{ (place.properties.distance / 1000).toFixed(2) }} km away
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div id="map-container" class="w-3/4 h-full"></div>
    </div>
  </div>
</template>
