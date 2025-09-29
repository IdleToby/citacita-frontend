<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSkillLevelByLang, getJobListByLangAndMajorGroupCode } from '@/api'
import { Input } from '@/components/ui/input'
import TestQuiz from '@/views/TestQuiz.vue'
import unitData from '@/data/unit_group_data.json'

type Industry = {
  id: string
  name: string
  educationLevel?: string
  skillLevel?: string
}

type Job = {
  id: string
  title: string
  majorGroupCode: string
  majorGroupTitle: string
  unitGroupCode: string
}

const router = useRouter()
const { locale, t } = useI18n()
const loading = ref(false)

// Helper function to get field suffix for multilingual data
function getFieldSuffix(lang: string): string {
  switch(lang) {
    case 'ms': return '_malay';
    case 'zh-CN': return '_chinese';
    case 'en':
    default: return '';
  }
}

// Get multilingual field value from data object
function getMultilingualField(dataObj: any, baseFieldName: string, targetLang: string): string {
  const suffix = getFieldSuffix(targetLang);
  const fieldName = baseFieldName + suffix;
  return dataObj[fieldName] || dataObj[baseFieldName] || '';
}

// Translate job title from unitData based on unit group code and language
function translateJobTitleFromData(unitGroupCode: string, targetLang: string): string {
  const unit = unitData.find((u: any) => u.unit_group_code === unitGroupCode);
  if (unit) {
    return getMultilingualField(unit, 'unit_group_title', targetLang);
  }
  return '';
}

// Translate major group title from unitData
function translateMajorGroupTitleFromData(unitGroupCode: string, targetLang: string): string {
  const unit = unitData.find((u: any) => u.unit_group_code === unitGroupCode);
  if (unit) {
    return getMultilingualField(unit, 'major_group_title', targetLang);
  }
  return '';
}

// Dynamic citabot image based on locale
const citabotImage = computed(() => {
  switch (locale.value) {
    case 'ms':
      return '/images/citabot-ms.png'
    case 'zh-CN':
      return '/images/citabot-zh.png'
    case 'en':
    default:
      return '/images/citabot.png'
  }
})
const error = ref('')

// Function to get the image path for each major group
function getMajorGroupImage(majorGroupCode: string) {
  return `/major group images/${majorGroupCode}. ${getMajorGroupImageName(majorGroupCode)}.png`
}

// Function to get the image name based on major group code
function getMajorGroupImageName(majorGroupCode: string) {
  const imageNames: Record<string, string> = {
    '0': 'Armed Forces',
    '1': 'Managers',
    '2': 'Professionals',
    '3': 'Technician and Associate Professionals',
    '4': 'Clerical Support Workers',
    '5': 'Service and Sales Workers',
    '6': 'Skilled Agricultural, Forestry, Livestock and Fishery Workers',
    '7': 'Craft and Related Trades Workers',
    '8': 'Plant and Machine Operations and Assembler',
    '9': 'Elementary Occupations',
  }
  return imageNames[majorGroupCode] || 'default'
}

// Industries and jobs fetched from API
const industries = ref<Industry[]>([])
const allJobs = ref<Job[]>([])
const searchQuery = ref('')

const showQuizModal = ref(false)
const testQuizRef = ref<any>(null)
const searchContainerRef = ref<HTMLElement | null>(null)
const savedQuizResults = ref<any[]>([])
const hasSeenQuiz = ref(false)

function goToQuiz() {
  showQuizModal.value = true
  // Check if we need to restore quiz results
  nextTick(() => {
    setTimeout(() => {
      if (testQuizRef.value && testQuizRef.value.restoreQuizResults) {
        const stored = sessionStorage.getItem('jobQuizResults')
        if (stored) {
          try {
            const quizState = JSON.parse(stored)
            // Check if results are not too old (within 15 minutes)
            if (Date.now() - quizState.timestamp < 900000) {
              testQuizRef.value.restoreQuizResults()
            }
          } catch (error) {
            console.error('Error checking quiz results:', error)
          }
        }
      }
    }, 100) // Small delay to ensure component is fully ready
  })
}

function closeQuizModal() {
  showQuizModal.value = false
  // Load saved quiz results after closing modal
  loadSavedQuizResults()
}

// Load saved quiz results from sessionStorage
function loadSavedQuizResults() {
  const stored = sessionStorage.getItem('jobQuizResults')
  if (stored) {
    try {
      const quizState = JSON.parse(stored)
      // Check if results are not too old (within 15 minutes)
      if (Date.now() - quizState.timestamp < 900000) {
        savedQuizResults.value = quizState.results || []
      } else {
        // Clear old results
        sessionStorage.removeItem('jobQuizResults')
        savedQuizResults.value = []
      }
    } catch (error) {
      console.error('Error loading quiz results:', error)
      savedQuizResults.value = []
    }
  }
}

// Navigate to job description from quiz result
function goToJobFromResult(unit: any) {
  const majorGroupCode = unit.details?.unit_data?.major_group_code || unit.major_group_code || ''
  const majorGroupTitle = unit.details?.unit_data?.major_group_title || unit.major_group_title || ''

  let slug = majorGroupTitle
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  if (!slug || slug.length < 2) {
    slug = `industry-${majorGroupCode}`
  }

  router.push({
    name: 'job-description',
    params: { industry: slug, jobId: unit.unit_group_code },
    query: { unitGroupCode: unit.unit_group_code }
  })
}

// Clear quiz results and restart
function restartQuiz() {
  sessionStorage.removeItem('jobQuizResults')
  savedQuizResults.value = []
  goToQuiz()
}

// Fetch industries from API
async function fetchIndustries() {
  loading.value = true
  error.value = ''
  try {
    const response = await getSkillLevelByLang(locale.value)
    if (response.data.code === 200) {
      const mappedIndustries = response.data.data.map((item: any) => ({
        id: item.majorGroupCode,
        name: item.majorGroupTitle,
        educationLevel: item.educationLevel,
        skillLevel: item.skillLevel
      }))

      // Sort industries to place Armed Forces (id: '0') at the end
      industries.value = mappedIndustries.sort((a: Industry, b: Industry) => {
        if (a.id === '0') return 1  // Move Armed Forces to the end
        if (b.id === '0') return -1 // Keep Armed Forces at the end
        return parseInt(a.id) - parseInt(b.id) // Sort others numerically
      })

      // After fetching industries, fetch all jobs
      await fetchAllJobs()
    } else {
      error.value = 'Failed to fetch industries'
    }
  } catch (err) {
    console.error('Error fetching industries:', err)
    error.value = 'Error connecting to server'
  } finally {
    loading.value = false
  }
}

// Fetch all jobs from all industries
async function fetchAllJobs() {
  try {
    const jobPromises = industries.value.map(async (industry) => {
      try {
        const response = await getJobListByLangAndMajorGroupCode(locale.value, industry.id)
        if (response.data.code === 200) {
          return response.data.data.map((item: any) => ({
            id: item.unitGroupCode,
            title: item.unitGroupTitle,
            majorGroupCode: item.majorGroupCode,
            majorGroupTitle: item.majorGroupTitle,
            unitGroupCode: item.unitGroupCode
          }))
        }
        return []
      } catch (err) {
        console.error(`Error fetching jobs for industry ${industry.id}:`, err)
        return []
      }
    })

    const jobArrays = await Promise.all(jobPromises)
    allJobs.value = jobArrays.flat()
  } catch (err) {
    console.error('Error fetching all jobs:', err)
  }
}

// Filter jobs based on search query
const filteredJobs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return allJobs.value.filter((job) =>
    job.title.toLowerCase().includes(q)
  )
})

// Autocomplete suggestions from loaded jobs only
const suggestions = ref<string[]>([])

// Fetch autocomplete suggestions from current loaded jobs only
async function fetchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  // Filter suggestions from all loaded jobs only
  const queryLower = query.toLowerCase()
  suggestions.value = allJobs.value
    .filter((job) => job.title.toLowerCase().includes(queryLower))
    .map((job) => job.title)
    .slice(0, 3)
}

// Create highlighted suggestions for display
const highlightedSuggestions = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) return []

  return suggestions.value.map(suggestion => {
    const regex = new RegExp(`(${query})`, 'gi')
    return suggestion.replace(regex, '<strong>$1</strong>')
  })
})

// Watch search query changes for autocomplete
let debounceTimer: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchSuggestions(searchQuery.value)
  }, 300) // 300ms debounce
}

function chooseSuggestion(suggestion: string) {
  searchQuery.value = suggestion
  suggestions.value = [] // Clear suggestions after selection
}

// Handle click outside to close suggestions
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (searchContainerRef.value && !searchContainerRef.value.contains(target)) {
    suggestions.value = []
  }
}

// Check if search query matches a job and navigate directly to job description
function handleJobNavigation(jobTitle: string) {
  const matchingJob = allJobs.value.find(job =>
    job.title.toLowerCase() === jobTitle.toLowerCase()
  )

  if (matchingJob) {
    let slug = matchingJob.majorGroupTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Keep word characters (includes unicode), spaces, and hyphens
      .trim()
      .replace(/\s+/g, '-')

    // If slug is empty or very short (happens with Chinese/special chars), use majorGroupCode as fallback
    if (!slug || slug.length < 2) {
      slug = `industry-${matchingJob.majorGroupCode}`
    }

    router.push({
      name: 'job-description',
      params: { industry: slug, jobId: matchingJob.unitGroupCode },
      query: { unitGroupCode: matchingJob.unitGroupCode }
    })
    return true
  }
  return false
}

function goToIndustry(industryName: string, industryId: string) {
  // Create a safe slug that works with all languages by using the majorGroupCode as base
  // and falling back to a generic slug if needed
  let slug = industryName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Keep word characters (includes unicode), spaces, and hyphens
    .trim()
    .replace(/\s+/g, '-')

  // If slug is empty or very short (happens with Chinese/special chars), use majorGroupCode as fallback
  if (!slug || slug.length < 2) {
    slug = `industry-${industryId}`
  }

  router.push({
    name: 'industry-jobs',
    params: { industry: slug },
    query: { majorGroupCode: industryId }
  })
}

// Watch for locale changes to refetch data
watch(locale, () => {
  fetchIndustries()
})

onMounted(() => {
  fetchIndustries()
  // Add click outside listener for autocomplete
  document.addEventListener('click', handleClickOutside)

  // Load saved quiz results
  loadSavedQuizResults()

  // Check if user has seen the quiz before
  hasSeenQuiz.value = localStorage.getItem('hasSeenQuiz') === 'true'

  // Auto-show quiz modal if:
  // 1. First visit (never seen quiz before), OR
  // 2. Not first visit but no saved quiz results found
  if (!hasSeenQuiz.value || savedQuizResults.value.length === 0) {
    // Small delay to ensure page is loaded
    setTimeout(() => {
      showQuizModal.value = true
      localStorage.setItem('hasSeenQuiz', 'true')
    }, 500)
  }
})

onUnmounted(() => {
  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="w-full min-h-full text-white relative">
        <!-- Fixed Background Layer with Blur -->
    <div
      class="fixed inset-0 -z-10"
      :style="{
        backgroundImage: 'url(/images/homepage-jobs-for-me.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(8px)'
      }"
    ></div>
    <!-- Background Overlay for additional opacity -->
    <div class="fixed inset-0 -z-10 bg-black/30"></div>
    <!-- Go Back Button - Middle Left -->
    <div class="fixed left-4 top-1/2 transform -translate-y-1/2 z-10">
      <button
        @click="router.push({ name: 'home' })"
        class="group flex items-center justify-center w-12 h-12 bg-white border-2 border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-x-1"
        aria-label="Go back"
      >
        <svg
          class="w-6 h-6 text-black transition-transform duration-300 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
        <!-- Hover tooltip -->
        <span
          class="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
        >
          {{ t('common.goBack') }}
        </span>
      </button>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{{ t('jobsPage.title') }}</h1>
          <p class="text-white/90 drop-shadow-md">{{ t('jobsPage.subtitle') }}</p>
        </div>
        <div ref="searchContainerRef" class="w-full md:w-80 relative">
          <Input
            v-model="searchQuery"
            :placeholder="t('jobsPage.searchPlaceholder')"
            @input="onSearchInput"
            class="bg-white text-black placeholder:text-gray-500"
          />
          <ul
            v-if="suggestions.length"
            class="absolute z-10 mt-1 w-full bg-white bg-opacity-50 backdrop-blur-sm border border-input rounded-md shadow-md max-h-32 overflow-auto text-black"
          >
            <li
              v-for="(suggestion, index) in suggestions"
              :key="suggestion"
              class="px-3 py-2 cursor-pointer hover:bg-accent"
              @click="chooseSuggestion(suggestion)"
            >
              <span v-html="highlightedSuggestions[index]"></span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <p class="text-white text-xl">Loading...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-white text-xl mb-4">{{ error }}</p>
        <button
          @click="fetchIndustries"
          class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>

      <!-- Show job search results -->
      <div v-else-if="searchQuery && filteredJobs.length" class="text-center py-8">
        <p class="text-lg mb-4 text-white drop-shadow-md">{{ t('jobsPage.jobSearchResults') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          <button
            v-for="job in filteredJobs"
            :key="job.id"
            class="group aspect-square rounded-xl border border-input bg-white hover:shadow-md transition p-4 flex items-center justify-center text-center"
            @click="handleJobNavigation(job.title)"
          >
            <div>
              <span class="text-lg font-medium text-gray-800 group-hover:text-primary block">{{ job.title }}</span>
              <span class="text-sm text-gray-600">{{ job.majorGroupTitle }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- No job results found message -->
      <div v-else-if="searchQuery && !filteredJobs.length" class="text-center py-8">
        <p class="text-lg text-white drop-shadow-md">{{ t('jobsPage.noResultsFound', { query: searchQuery }) }}</p>
        <p class="text-sm text-white/80 mt-2 drop-shadow-sm">{{ t('jobsPage.tryDifferentSearch') }}</p>
      </div>

      <!-- Main content area when not searching -->
      <template v-else>
        <!-- Saved Quiz Results Section -->
        <div v-if="savedQuizResults.length > 0" class="mb-5">
          <div class="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-bold text-gray-800">{{ t('quiz.results.topMatches') }}</h3>
              <button
                @click="restartQuiz"
                class="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium text-xs"
              >
                {{ t('quiz.buttons.restart') || 'Restart Quiz' }}
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div
                v-for="(result, index) in savedQuizResults.slice(0, 5)"
                :key="result.unit_group_code"
                @click="goToJobFromResult(result)"
                class="cursor-pointer bg-gradient-to-b from-white to-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all hover:scale-105 relative overflow-hidden"
              >
                <!-- Rank Badge -->
                <div class="absolute top-1.5 right-1.5 w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {{ index + 1 }}
                </div>

                <div class="pr-8">
                  <h4 class="font-semibold text-gray-800 text-xs mb-1.5 line-clamp-2">
                    {{ translateJobTitleFromData(result.unit_group_code, locale) || result.unit_group_title }}
                  </h4>
                  <div class="text-xs text-gray-600 mb-1.5">
                    {{ translateMajorGroupTitleFromData(result.unit_group_code, locale) || result.details?.unit_data?.major_group_title || '' }}
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-medium text-green-600">
                      {{ t('quiz.results.matchScore', { score: result.score }) || `Match: ${result.score}%` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Industries grid (always show when not searching) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          v-for="industry in industries"
          :key="industry.id"
          class="group aspect-square rounded-xl border border-input bg-white hover:shadow-md transition overflow-hidden relative"
          @click="goToIndustry(industry.name, industry.id)"
        >
          <!-- Image covering most of the card -->
          <div class="absolute inset-0 bottom-20">
            <img
              :src="getMajorGroupImage(industry.id)"
              :alt="industry.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              @error="($event.target as HTMLImageElement)?.style && (($event.target as HTMLImageElement).style.display='none')"
            />
          </div>

          <!-- Text area at the bottom -->
          <div class="absolute bottom-0 left-0 right-0 h-20 bg-white flex items-center justify-center p-3">
            <span class="text-sm font-medium text-gray-800 group-hover:text-primary leading-tight text-center">{{ industry.name }}</span>
          </div>
        </button>
      </div>
      </template>
    </div>

    <!-- Citabot Icon -->
    <div class="fixed bottom-1 right-1 z-1">
      <img
        :src="citabotImage"
        alt="Citabot"
        class="w-50 h-50 cursor-pointer transition-transform duration-300 ease-out hover:scale-110 object-contain"
        style="width: 200px; height: 200px; max-width: 200px; max-height: 200px;"
        @click="router.push('/ai')"
      />
    </div>
  </div>
  <!-- Modal弹窗 -->
  <div
    v-if="showQuizModal"
    class="fixed backdrop-blur-sm bg-white/20 flex justify-center p-4"
    style="top: 90px; left: 0; right: 0; bottom: 0;"
    @click.self="closeQuizModal"
  >
    <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-end items-center p-6 border-b">
        <button
          @click="closeQuizModal"
          class="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
          aria-label="Close modal"
        >
          ×
        </button>
      </div>

      <!-- 问卷组件 -->
      <div class="p-6">
        <TestQuiz ref="testQuizRef" @quiz-completed="closeQuizModal" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}
</style>
