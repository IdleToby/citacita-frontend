<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { getJobListByLangAndMajorGroupCode } from '@/api'
import TestQuiz from '@/views/TestQuiz.vue'

type Job = {
  id: string
  title: string
  majorGroupCode?: string
  majorGroupTitle?: string
  subMajorGroupCode?: string
  subMajorGroupTitle?: string
  minorGroupCode?: string
  minorGroupTitle?: string
  unitGroupCode?: string
}

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const loading = ref(false)
const error = ref('')

const showQuizModal = ref(false)
const testQuizRef = ref<any>(null)
const searchContainerRef = ref<HTMLElement | null>(null)

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
            // Check if results are not too old (within 2 hours)
            if (Date.now() - quizState.timestamp < 7200000) {
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
}

// Make goToQuiz available globally for v-html onclick
if (typeof window !== 'undefined') {
  (window as any).openJobQuiz = goToQuiz
}

// Go back to JobsView
function goBack() {
  router.push({ name: 'jobs' })
}

// derive industry from slug and get majorGroupCode from query
const industrySlug = computed(() => String(route.params.industry || 'industry'))
const majorGroupCode = computed(() => String(route.query.majorGroupCode || ''))
const industryName = computed(() => {
  // Use localized industry name if majorGroupCode is available
  if (majorGroupCode.value && t(`industries.${majorGroupCode.value}`)) {
    return t(`industries.${majorGroupCode.value}`)
  }
  // Fallback to slug transformation
  return industrySlug.value
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
})

// Jobs fetched from API
const jobs = ref<Job[]>([])
const jobQuery = ref('')

// Pagination
const currentPage = ref(0)
const jobsPerPage = 10

// Fetch jobs for the selected industry
async function fetchJobs() {
  if (!majorGroupCode.value) {
    error.value = 'No major group selected'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const response = await getJobListByLangAndMajorGroupCode(locale.value, majorGroupCode.value)
    if (response.data.code === 200) {
      jobs.value = response.data.data.map((item: any) => ({
        id: item.unitGroupCode,
        title: item.unitGroupTitle,
        majorGroupCode: item.majorGroupCode,
        majorGroupTitle: item.majorGroupTitle,
        subMajorGroupCode: item.subMajorGroupCode,
        subMajorGroupTitle: item.subMajorGroupTitle,
        minorGroupCode: item.minorGroupCode,
        minorGroupTitle: item.minorGroupTitle,
        unitGroupCode: item.unitGroupCode
      }))
    } else {
      error.value = 'Failed to fetch jobs'
    }
  } catch (err) {
    console.error('Error fetching jobs:', err)
    error.value = 'Error connecting to server'
  } finally {
    loading.value = false
  }
}

const filteredJobs = computed(() => {
  const q = jobQuery.value.trim().toLowerCase()
  let result = jobs.value

  if (q) {
    result = jobs.value.filter((j) => j.title.toLowerCase().includes(q))
  }

  // Sort alphabetically by title
  return result.sort((a, b) => a.title.localeCompare(b.title))
})

// Pagination computed properties
const totalPages = computed(() => {
  return Math.ceil(filteredJobs.value.length / jobsPerPage)
})

const paginatedJobs = computed(() => {
  const start = currentPage.value * jobsPerPage
  const end = start + jobsPerPage
  return filteredJobs.value.slice(start, end)
})

// Reset to first page when search query changes
watch(jobQuery, () => {
  currentPage.value = 0
})

// Reset to first page when jobs are refetched
watch(jobs, () => {
  currentPage.value = 0
})

// Autocomplete suggestions from current page jobs only
const suggestions = ref<string[]>([])

// Fetch autocomplete suggestions from current page jobs only
async function fetchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  // Filter suggestions from jobs on current page only
  const queryLower = query.toLowerCase()
  suggestions.value = jobs.value
    .filter((job) => job.title.toLowerCase().includes(queryLower))
    .map((job) => job.title)
    .slice(0, 3)
}

// Create highlighted suggestions for display
const highlightedSuggestions = computed(() => {
  const query = jobQuery.value.trim()
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
    fetchSuggestions(jobQuery.value)
  }, 300) // 300ms debounce
}

function chooseSuggestion(t: string) {
  jobQuery.value = t
  suggestions.value = [] // Clear suggestions after selection
}

// Handle click outside to close suggestions
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (searchContainerRef.value && !searchContainerRef.value.contains(target)) {
    suggestions.value = []
  }
}

function goToJob(jobId: string) {
  router.push({
    name: 'job-description',
    params: { industry: industrySlug.value, jobId },
    query: { unitGroupCode: jobId }
  })
}

// Pagination navigation functions
function goToPage(pageIndex: number) {
  if (pageIndex >= 0 && pageIndex < totalPages.value) {
    currentPage.value = pageIndex
  }
}

function goToPreviousPage() {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

function goToNextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
  }
}

// Smart pagination display logic
const paginationPages = computed((): Array<number | 'ellipsis'> => {
  const total = totalPages.value
  const current = currentPage.value
  const maxVisible = 4

  if (total <= maxVisible) {
    // Show all pages if total is less than max visible
    return Array.from({ length: total }, (_, i) => i)
  }

  const pages: Array<number | 'ellipsis'> = []

  if (current <= 1) {
    // Show first pages: 1 2 ... last-1 last
    pages.push(0, 1)
    if (total > 3) {
      pages.push('ellipsis')
      pages.push(total - 2, total - 1)
    }
  } else if (current >= total - 2) {
    // Show last pages: 1 2 ... second-last last
    pages.push(0, 1)
    if (total > 3) {
      pages.push('ellipsis')
      pages.push(total - 2, total - 1)
    }
  } else {
    // Show middle pages: 1 ... current-1 current current+1 ... last
    pages.push(0)
    if (current > 2) {
      pages.push('ellipsis')
    }
    pages.push(current - 1, current, current + 1)
    if (current < total - 3) {
      pages.push('ellipsis')
    }
    pages.push(total - 1)
  }

  // Remove duplicates and maintain order
  const uniquePages: Array<number | 'ellipsis'> = []
  const seen = new Set<number>()

  for (const page of pages) {
    if (page === 'ellipsis' || !seen.has(page as number)) {
      uniquePages.push(page)
      if (page !== 'ellipsis') {
        seen.add(page as number)
      }
    }
  }

  return uniquePages
})

// Watch for route changes to refetch jobs
watch(majorGroupCode, () => {
  if (majorGroupCode.value) {
    fetchJobs()
  }
})

// Watch for locale changes to refetch data
watch(locale, () => {
  if (majorGroupCode.value) {
    fetchJobs()
  }
})

onMounted(() => {
  if (majorGroupCode.value) {
    fetchJobs()
  }
  // Add click outside listener for autocomplete
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="w-full h-screen overflow-hidden text-white relative">
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
        @click="goBack"
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
    <div class="fixed left-4 bottom-4 z-10">
      <button
        class="quiz-button group px-2 py-4 bg-gradient-to-b from-[#FFA500] to-[#FF6B00] text-white shadow-lg rounded-2xl text-sm font-bold hover:shadow-xl transition-all duration-200 flex flex-col items-center gap-3 min-w-[100px] relative overflow-hidden"
        aria-label="Job quiz"
        title="Job quiz"
        @click="goToQuiz"
      >
        <!-- Icon -->
        <div>
          <img
            src="/icon.png"
            alt="Quiz icon"
            class="w-14 h-14 object-contain"
          />
        </div>

        <!-- Text -->
        <div class="text-center leading-tight">
          <div class="text-lg font-bold">{{ t('jobDescriptionPage.jobQuiz').split(' ')[0] }}</div>
          <div class="text-lg font-bold">{{ t('jobDescriptionPage.jobQuiz').split(' ')[1] }}</div>
        </div>
      </button>
    </div>

    <div class="max-w-6xl mx-auto px-4 pt-8 pb-24 space-y-6 h-full overflow-hidden">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{{ t('industryJobsPage.title') }}</h1>
          <p class="text-white/90 drop-shadow-md">{{ t('industryJobsPage.majorGroup') }}: {{ industryName }}</p>
        </div>
        <div ref="searchContainerRef" class="w-full md:w-80 relative">
          <Input
            v-model="jobQuery"
            :placeholder="t('industryJobsPage.searchPlaceholder')"
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

      <h2
        class="text-xl md:text-2xl font-semibold bg-[#C65A0F] text-white px-4 py-2 rounded-lg text-center mx-auto max-w-3xl"
        v-html="t('industryJobsPage.quizPrompt').replace(t('industryJobsPage.here'), `<button type='button' class='font-bold underline underline-offset-2 hover:scale-110 transition-transform duration-200 inline-block' onclick='window.openJobQuiz()'>${t('industryJobsPage.here')}</button>`)"
      >
      </h2>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <p class="text-white text-xl">Loading...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-white text-xl mb-4">{{ error }}</p>
        <button
          @click="fetchJobs"
          class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>

      <!-- No results found message -->
      <div v-else-if="jobQuery && !filteredJobs.length" class="text-center py-8">
        <p class="text-lg text-white drop-shadow-md">{{ t('industryJobsPage.noResultsFound', { query: jobQuery }) }}</p>
        <p class="text-sm text-white/80 mt-2 drop-shadow-sm">{{ t('industryJobsPage.tryDifferentSearch') }}</p>
      </div>

      <!-- Jobs grid -->
      <div v-else class="space-y-8 h-[calc(100%-120px)] overflow-auto pr-1">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <button
            v-for="job in paginatedJobs"
            :key="job.id"
            class="group aspect-square rounded-xl border border-input bg-white hover:shadow-md transition p-4 flex items-center justify-center text-center"
            @click="goToJob(job.id)"
          >
            <span class="text-lg font-medium text-gray-800 group-hover:text-primary">{{ job.title }}</span>
          </button>
        </div>

        <!-- Enhanced Pagination with Previous/Next (fixed at bottom, aligned with quiz button) -->
        <div v-if="totalPages > 1" class="fixed left-1/2 -translate-x-1/2 bottom-4 z-10">
          <div class="bg-purple-200/30 backdrop-blur-sm rounded-full px-6 py-3 flex items-center space-x-4 border border-purple-200/20 shadow-md">
            <!-- Previous Button -->
            <button
              @click="goToPreviousPage"
              :disabled="currentPage === 0"
              class="flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium"
              :class="{
                'text-white hover:bg-purple-700/40 hover:scale-105': currentPage > 0,
                'text-gray-500 cursor-not-allowed opacity-50': currentPage === 0
              }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              <span>Previous</span>
            </button>

            <!-- Page Numbers with Firefly Effect -->
            <div class="flex items-center space-x-2">
              <template v-for="(page, index) in paginationPages" :key="index">
                <!-- Ellipsis -->
                <span
                  v-if="page === 'ellipsis'"
                  class="text-white/60 px-2"
                >
                  ...
                </span>

                <!-- Page Number -->
                <button
                  v-else
                  @click="goToPage(page as number)"
                  class="relative transition-all duration-500 ease-out hover:scale-110"
                  :class="{
                    'w-8 h-8': (page as number) !== currentPage,
                    'w-10 h-10': (page as number) === currentPage
                  }"
                >
                  <!-- Firefly Outer Glow -->
                  <div
                    class="absolute inset-0 rounded-full transition-all duration-700"
                    :class="{
                      'bg-purple-300/20 animate-pulse': (page as number) !== currentPage,
                      'bg-yellow-300/60 animate-ping': (page as number) === currentPage
                    }"
                  ></div>

                  <!-- Firefly Inner Circle -->
                  <div
                    class="relative w-full h-full rounded-full transition-all duration-500 border flex items-center justify-center text-xs font-bold"
                    :class="{
                      'bg-purple-400/30 border-purple-300/40 text-white hover:bg-purple-400/50': (page as number) !== currentPage,
                      'bg-yellow-200 border-yellow-100 text-purple-900 shadow-lg shadow-yellow-200/50': (page as number) === currentPage
                    }"
                  >
                    <span>{{ (page as number) + 1 }}</span>

                    <!-- Current Page Firefly Effect -->
                    <div
                      v-if="(page as number) === currentPage"
                      class="absolute inset-0 rounded-full bg-yellow-100 animate-pulse opacity-60"
                    ></div>
                  </div>
                </button>
              </template>
            </div>

            <!-- Next Button -->
            <button
              @click="goToNextPage"
              :disabled="currentPage >= totalPages - 1"
              class="flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium"
              :class="{
                'text-white hover:bg-purple-700/40 hover:scale-105': currentPage < totalPages - 1,
                'text-gray-500 cursor-not-allowed opacity-50': currentPage >= totalPages - 1
              }"
            >
              <span>Next</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Modal弹窗 -->
  <div
    v-if="showQuizModal"
    class="fixed z-30 backdrop-blur-sm bg-white/20 flex justify-center p-4"
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
@keyframes wiggle {
  0%, 100% {
    transform: rotate(0deg) translate(0px, 0px);
  }
  25% {
    transform: rotate(-2deg) translate(-1px, 0px);
  }
  75% {
    transform: rotate(2deg) translate(1px, 0px);
  }
}

.quiz-button:hover {
  animation: wiggle 0.6s ease-in-out infinite;
}
</style>
