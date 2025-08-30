<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import { getSkillLevelByLang, getJobListByLangAndMajorGroupCode } from '@/api'
import { Input } from '@/components/ui/input'
import TestQuiz from '@/views/testquiz.vue'

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
const loading = ref(false)
const error = ref('')

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
    const response = await getSkillLevelByLang('en')
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
        const response = await getJobListByLangAndMajorGroupCode('en', industry.id)
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

// Filter industries based on search query (only show if no exact job match)
const filteredIndustries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return industries.value

  // If there's an exact job match, don't show industries
  const exactJobMatch = allJobs.value.some(job =>
    job.title.toLowerCase() === q
  )
  if (exactJobMatch) return []

  return industries.value.filter((industry) =>
    industry.name.toLowerCase().startsWith(q)
  )
})

// Combined autocomplete suggestions for both industries and jobs
const suggestions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return [] as string[]

  const industrySuggestions = industries.value
    .filter((industry) => industry.name.toLowerCase().startsWith(q))
    .map(industry => industry.name)

  const jobSuggestions = allJobs.value
    .filter((job) => job.title.toLowerCase().startsWith(q))
    .map(job => job.title)

  // Combine and limit to 5 suggestions, prioritizing exact matches
  return [...industrySuggestions, ...jobSuggestions].slice(0, 5)
})

function chooseSuggestion(suggestion: string) {
  searchQuery.value = suggestion
}

// Check if search query matches a job and navigate directly to job description
function handleJobNavigation(jobTitle: string) {
  const matchingJob = allJobs.value.find(job =>
    job.title.toLowerCase() === jobTitle.toLowerCase()
  )

  if (matchingJob) {
    const slug = matchingJob.majorGroupTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')

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
  // slugify industry name for route param
  const slug = industryName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  router.push({
    name: 'industry-jobs',
    params: { industry: slug },
    query: { majorGroupCode: industryId }
  })
}

onMounted(() => {
  fetchIndustries()
})
</script>

<template>
  <div class="w-full min-h-full bg-white text-black">
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold">Industries in Malaysia</h1>
          <p class="text-muted-foreground">Click to discover jobs available</p>
        </div>
        <div class="w-full md:w-80 relative">
          <Input v-model="searchQuery" placeholder="Search industries or jobs..." />
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

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <p>Loading industries...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8 text-red-600">
        <p>{{ error }}</p>
        <button
          @click="fetchIndustries"
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>

      <!-- Show message if search matches a job -->
      <div v-else-if="searchQuery && !filteredIndustries.length && allJobs.some((job: Job) => job.title.toLowerCase().startsWith(searchQuery.toLowerCase()))" class="text-center py-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          <button
            v-for="job in allJobs.filter((job: Job) => job.title.toLowerCase().startsWith(searchQuery.toLowerCase()))"
            :key="job.id"
            class="group aspect-square rounded-xl border border-input bg-card hover:shadow-md transition p-4 flex items-center justify-center text-center bg-blue-50"
            @click="handleJobNavigation(job.title)"
          >
            <div>
              <span class="text-lg font-medium group-hover:text-primary block">{{ job.title }}</span>
              <span class="text-sm text-muted-foreground">{{ job.majorGroupTitle }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- No results found message -->
      <div v-else-if="searchQuery && !filteredIndustries.length && !allJobs.some((job: Job) => job.title.toLowerCase().startsWith(searchQuery.toLowerCase()))" class="text-center py-8">
        <p class="text-lg text-gray-600">No results found for "{{ searchQuery }}"</p>
        <p class="text-sm text-muted-foreground mt-2">Try searching for a different industry or job title</p>
      </div>

      <!-- Industries grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          v-for="industry in filteredIndustries"
          :key="industry.id"
          class="group aspect-square rounded-xl border border-input bg-card hover:shadow-md transition p-4 flex items-center justify-center text-center"
          @click="goToIndustry(industry.name, industry.id)"
        >
          <span class="text-lg font-medium group-hover:text-primary">{{ industry.name }}</span>
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
