<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDetailJobByLangAndUnitGroupCode, getSkillLevelByLangAndId } from '@/api'
import TestQuiz from '@/views/TestQuiz.vue'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const loading = ref(false)
const error = ref('')

const showQuizModal = ref(false)

function goToQuiz() {
  showQuizModal.value = true
}

function closeQuizModal() {
  showQuizModal.value = false
}

const industrySlug = computed(() => String(route.params.industry || 'industry'))
const jobId = computed(() => String(route.params.jobId || '0'))
const unitGroupCode = computed(() => String(route.query.unitGroupCode || jobId.value))

const industryName = computed(() =>
  industrySlug.value
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
)

// Job details from API
const jobDetails = ref({
  unitGroupCode: '',
  majorGroupCode: '',
  majorGroupTitle: '',
  subMajorGroupCode: '',
  subMajorGroupTitle: '',
  minorGroupCode: '',
  minorGroupTitle: '',
  unitGroupTitle: '',
  unitGroupDescription: '',
  tasksInclude: '',
  examples: '',
  skillLevel: ''
})

// Skill level details from API
const skillDetails = ref({
  majorGroupCode: '',
  majorGroupTitle: '',
  educationLevel: '',
  skillLevel: ''
})

const jobTitle = computed(() => jobDetails.value.unitGroupTitle || `Job ${jobId.value}`)
const skillLevel = computed(() => skillDetails.value.skillLevel || jobDetails.value.skillLevel || 'Unknown')
const jobDescription = computed(() => jobDetails.value.unitGroupDescription || 'No description available.')
const jobTasks = computed(() => {
  if (!jobDetails.value.tasksInclude) return ['No tasks available']

  // Clean up the tasks string and convert alphabetical ordering to bullet points
  const cleanedTasks = jobDetails.value.tasksInclude
    // Remove leading dots and spaces
    .replace(/^\s*\.\s*/gm, '')
    // Remove extra indentation (multiple spaces at start of lines)
    .replace(/^\s{2,}/gm, '')
    // Normalize letter casing for alphabetical lists (A) -> a), B) -> b), etc.)
    .replace(/\b([A-Z])\)/g, (match, letter) => letter.toLowerCase() + ')')
    // Split by alphabetical markers and "and" prefixes
    .split(/(?=\s*[a-z]\))|(?=\s*and\s*$)|(?=\s*and\s+[a-z]\))/)
    .map(task => task.trim())
    .filter(task => task.length > 0)
    // Remove alphabetical markers (a), b), c), etc.) and "and" prefixes
    .map(task => task.replace(/^(and\s+)?[a-z]\)\s*/i, '').trim())
    // Remove any remaining leading dots or periods and extra whitespace
    .map(task => task.replace(/^[\.\s]+/, '').trim())
    .filter(task => task.length > 0)

  // Fix the "and" separation issue - combine standalone "and" with the next task
  const finalTasks = []
  for (let i = 0; i < cleanedTasks.length; i++) {
    const currentTask = cleanedTasks[i]
    const nextTask = cleanedTasks[i + 1]

    // If current task is just "and" and there's a next task, combine them
    if (currentTask.toLowerCase() === 'and' && nextTask) {
      finalTasks.push(`and ${nextTask}`)
      i++ // Skip the next task since we've combined it
    } else if (currentTask.toLowerCase() !== 'and') {
      // Only add non-standalone "and" tasks
      finalTasks.push(currentTask)
    }
  }

  return finalTasks
})

const jobExamples = computed(() => {
  if (!jobDetails.value.examples) return ['No examples available']

  // Clean up the examples string similar to tasks
  const cleanedExamples = jobDetails.value.examples
    // Remove leading dots and spaces
    .replace(/^\s*\.\s*/gm, '')
    // Remove extra indentation (multiple spaces at start of lines)
    .replace(/^\s{2,}/gm, '')
    // Split by common delimiters like semicolons, commas, or line breaks
    .split(/[;,\n]/)
    .map(example => example.trim())
    .filter(example => example.length > 0)
    // Remove any remaining leading dots or periods
    .map(example => example.replace(/^[\.\s]+/, '').trim())
    .filter(example => example.length > 0)

  return cleanedExamples
})


// Fetch job details from API
async function fetchJobDetails() {
  if (!unitGroupCode.value) {
    error.value = 'No job selected'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const response = await getDetailJobByLangAndUnitGroupCode(locale.value, unitGroupCode.value)
    if (response.data.code === 200) {
      jobDetails.value = response.data.data
      // After getting job details, fetch skill level details
      await fetchSkillDetails()
    } else {
      error.value = 'Failed to fetch job details'
    }
  } catch (err) {
    console.error('Error fetching job details:', err)
    error.value = 'Error connecting to server'
  } finally {
    loading.value = false
  }
}

// Fetch skill level details from API
async function fetchSkillDetails() {
  if (!jobDetails.value.majorGroupCode) {
    return
  }

  try {
    const response = await getSkillLevelByLangAndId(locale.value, jobDetails.value.majorGroupCode)
    if (response.data.code === 200) {
      skillDetails.value = response.data.data
    } else {
      console.error('Failed to fetch skill details')
    }
  } catch (err) {
    console.error('Error fetching skill details:', err)
  }
}

// Watch for route changes to refetch job details
watch(unitGroupCode, () => {
  if (unitGroupCode.value) {
    fetchJobDetails()
  }
})

// Watch for locale changes to refetch data
watch(locale, () => {
  if (unitGroupCode.value) {
    fetchJobDetails()
  }
})

// Go back to IndustryJobsView
function goBack() {
  const majorGroupCode = route.query.majorGroupCode || jobDetails.value.majorGroupCode
  router.push({
    name: 'industry-jobs',
    params: { industry: industrySlug.value },
    query: { majorGroupCode }
  })
}

onMounted(() => {
  if (unitGroupCode.value) {
    fetchJobDetails()
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

    <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <p>Loading job details...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8 text-red-600">
        <p>{{ error }}</p>
        <button
          @click="fetchJobDetails"
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>

      <!-- Job details -->
      <template v-else>
        <header class="space-y-3">
          <div class="space-y-1">
            <h1 class="text-3xl md:text-4xl font-bold">
              {{ jobTitle }}
              <span class="text-lg font-normal text-muted-foreground ml-2">({{ jobDetails.unitGroupCode }})</span>
            </h1>
            <p class="text-muted-foreground">Major group: {{ jobDetails.majorGroupTitle || industryName }}</p>
          </div>
          <div>
            <p class="text-xl font-semibold">Skill level: {{ skillLevel }}</p>
          </div>
        </header>

        <section class="space-y-2">
          <h2 class="text-xl font-semibold">Job description</h2>
          <p class="text-sm md:text-base">{{ jobDescription }}</p>
        </section>

        <section class="space-y-2">
          <h2 class="text-xl font-semibold">Tasks</h2>
          <div class="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50">
            <ul class="list-disc ml-6 space-y-1">
              <li v-for="(task, idx) in jobTasks" :key="idx">{{ task }}</li>
            </ul>
          </div>
        </section>

        <section class="space-y-2">
          <h2 class="text-xl font-semibold">Examples</h2>
          <div class="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50">
            <ul class="list-disc ml-6 space-y-1">
              <li v-for="(example, idx) in jobExamples" :key="idx">{{ example }}</li>
            </ul>
          </div>
        </section>
      </template>
    </div>

    <!-- Floating Job quiz bubble -->
    <button
      class="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#C65A0F] text-white shadow-lg flex items-center justify-center text-sm md:text-base font-bold hover:scale-110 transition-transform duration-200"
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


