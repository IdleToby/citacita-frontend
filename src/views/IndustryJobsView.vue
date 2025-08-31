<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { getJobListByLangAndMajorGroupCode, autoCompleteJobByLangAndUnitGroupTitle } from '@/api'
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
const loading = ref(false)
const error = ref('')

const showQuizModal = ref(false)

function goToQuiz() {
  showQuizModal.value = true
}

function closeQuizModal() {
  showQuizModal.value = false
}

// Go back to JobsView
function goBack() {
  router.push({ name: 'jobs' })
}

// derive industry from slug and get majorGroupCode from query
const industrySlug = computed(() => String(route.params.industry || 'industry'))
const majorGroupCode = computed(() => String(route.query.majorGroupCode || ''))
const industryName = computed(() =>
  industrySlug.value
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
)

// Jobs fetched from API
const jobs = ref<Job[]>([])
const jobQuery = ref('')

// Fetch jobs for the selected industry
async function fetchJobs() {
  if (!majorGroupCode.value) {
    error.value = 'No industry selected'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const response = await getJobListByLangAndMajorGroupCode('en', majorGroupCode.value)
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
  if (!q) return jobs.value
  return jobs.value.filter((j) => j.title.toLowerCase().startsWith(q))
})

// API-based autocomplete suggestions
const suggestions = ref<string[]>([])

// Fetch autocomplete suggestions from API
async function fetchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  try {
    const response = await autoCompleteJobByLangAndUnitGroupTitle('en', query)
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
    fetchSuggestions(jobQuery.value)
  }, 300) // 300ms debounce
}

function chooseSuggestion(t: string) {
  jobQuery.value = t
  suggestions.value = [] // Clear suggestions after selection
}

function goToJob(jobId: string) {
  router.push({
    name: 'job-description',
    params: { industry: industrySlug.value, jobId },
    query: { unitGroupCode: jobId }
  })
}

// Watch for route changes to refetch jobs
watch(majorGroupCode, () => {
  if (majorGroupCode.value) {
    fetchJobs()
  }
})

onMounted(() => {
  if (majorGroupCode.value) {
    fetchJobs()
  }
})
</script>

<template>
  <div class="w-full min-h-full bg-white text-black">
    <!-- Go Back Button -->
    <div class="fixed left-6 top-1/2 transform -translate-y-1/2 z-10">
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
          Go back
        </span>
      </button>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold">Jobs in Malaysia</h1>
          <p class="text-muted-foreground">Industry: {{ industryName }}</p>
        </div>
        <div class="w-full md:w-80 relative">
          <Input
            v-model="jobQuery"
            placeholder="Search jobs..."
            @input="onSearchInput"
          />
          <ul
            v-if="suggestions.length"
            class="absolute z-10 mt-1 w-full bg-white border border-input rounded-md shadow-md max-h-60 overflow-auto"
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

      <h2
        class="text-xl md:text-2xl font-semibold bg-[#C65A0F] text-white px-4 py-2 rounded-lg text-center mx-auto max-w-3xl"
      >
        Not sure what job suits you? Click
        <button
          type="button"
          class="font-bold underline underline-offset-2"
          @click="goToQuiz"
        >
          here
        </button>
        to take our job quiz!
      </h2>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <p>Loading jobs...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8 text-red-600">
        <p>{{ error }}</p>
        <button
          @click="fetchJobs"
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>

      <!-- No results found message -->
      <div v-else-if="jobQuery && !filteredJobs.length" class="text-center py-8">
        <p class="text-lg text-gray-600">No results found for "{{ jobQuery }}"</p>
        <p class="text-sm text-muted-foreground mt-2">Try searching for a different job title</p>
      </div>

      <!-- Jobs grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          v-for="job in filteredJobs"
          :key="job.id"
          class="group aspect-square rounded-xl border border-input bg-card hover:shadow-md transition p-4 flex items-center justify-center text-center"
          @click="goToJob(job.id)"
        >
          <span class="text-lg font-medium group-hover:text-primary">{{ job.title }}</span>
        </button>
      </div>
    </div>

    <!-- Floating Job quiz bubble -->
    <button
      class="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#C65A0F] text-white shadow-lg flex items-center justify-center text-sm md:text-base font-bold"
      aria-label="Job quiz"
      title="Job quiz"
      @click="goToQuiz"
    >
      Job Quiz
    </button>
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


