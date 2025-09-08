<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSkillLevelByLang, getJobListByLangAndMajorGroupCode, autoCompleteJobByLangAndUnitGroupTitle } from '@/api'
import { Input } from '@/components/ui/input'
import TestQuiz from '@/views/TestQuiz.vue'

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
    '9': 'Elementary Occupations'
  }
  return imageNames[majorGroupCode] || 'default'
}

// Industries and jobs fetched from API
const industries = ref<Industry[]>([])
const allJobs = ref<Job[]>([])
const searchQuery = ref('')

const showQuizModal = ref(false)

function goToQuiz() {
  showQuizModal.value = true
}

function closeQuizModal() {
  showQuizModal.value = false
}

// Fetch industries from API
async function fetchIndustries() {
  loading.value = true
  error.value = ''
  try {
    const response = await getSkillLevelByLang(locale.value)
    if (response.data.code === 200) {
      industries.value = response.data.data.map((item: any) => ({
        id: item.majorGroupCode,
        name: item.majorGroupTitle,
        educationLevel: item.educationLevel,
        skillLevel: item.skillLevel
      }))
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
    job.title.toLowerCase().startsWith(q)
  )
})

// API-based autocomplete suggestions for jobs only
const suggestions = ref<string[]>([])

// Fetch autocomplete suggestions from API
async function fetchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  try {
    const response = await autoCompleteJobByLangAndUnitGroupTitle(locale.value, query)
    if (response.data.code === 200) {
      // Filter API results to only show jobs that start with the query
      const queryLower = query.toLowerCase()
      suggestions.value = response.data.data
        .map((item: any) => item.unitGroupTitle)
        .filter((title: string) => title.toLowerCase().startsWith(queryLower))
        .slice(0, 5)
    } else {
      suggestions.value = []
    }
  } catch (err) {
    console.error('Error fetching autocomplete suggestions:', err)
    suggestions.value = []
  }
}

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
        filter: 'blur(2.5px)'
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

    <!-- Job Quiz Button -->
    <div class="fixed left-3 top-1/6 transform -translate-y-1/2 z-10">
      <button
        class="px-5 py-5 bg-[#C65A0F] text-white shadow-lg rounded-full text-sm md:text-base font-bold hover:scale-105 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        aria-label="Job quiz"
        title="Job quiz"
        @click="goToQuiz"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        {{ t('jobDescriptionPage.jobQuiz') }}
      </button>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{{ t('jobsPage.title') }}</h1>
          <p class="text-white/90 drop-shadow-md">{{ t('jobsPage.subtitle') }}</p>
        </div>
        <div class="w-full md:w-80 relative">
          <Input
            v-model="searchQuery"
            :placeholder="t('jobsPage.searchPlaceholder')"
            @input="onSearchInput"
            class="bg-white text-black placeholder:text-gray-500"
          />
          <ul
            v-if="suggestions.length"
            class="absolute z-10 mt-1 w-full bg-white border border-input rounded-md shadow-md max-h-60 overflow-auto text-black"
          >
            <li
              v-for="s in suggestions"
              :key="s"
              class="px-3 py-2 cursor-pointer hover:bg-accent"
              @click="chooseSuggestion(s)"
            >
              {{ s }}
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

      <!-- Industries grid (show when no search) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
        <TestQuiz @quiz-completed="closeQuizModal" />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
