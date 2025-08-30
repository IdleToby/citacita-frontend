<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getDetailJobByLangAndUnitGroupCode } from '@/api'

const route = useRoute()
const loading = ref(false)
const error = ref('')

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
  skillLevel: ''
})

const jobTitle = computed(() => jobDetails.value.unitGroupTitle || `Job ${jobId.value}`)
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
const skillLevel = computed(() => jobDetails.value.skillLevel || 'Unknown')

// Fetch job details from API
async function fetchJobDetails() {
  if (!unitGroupCode.value) {
    error.value = 'No job selected'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const response = await getDetailJobByLangAndUnitGroupCode('en', unitGroupCode.value)
    if (response.data.code === 200) {
      jobDetails.value = response.data.data
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

// Watch for route changes to refetch job details
watch(unitGroupCode, () => {
  if (unitGroupCode.value) {
    fetchJobDetails()
  }
})

onMounted(() => {
  if (unitGroupCode.value) {
    fetchJobDetails()
  }
})
</script>

<template>
  <div class="w-full min-h-full bg-white text-black">
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
        <header class="space-y-1">
          <h1 class="text-3xl md:text-4xl font-bold">{{ jobTitle }}</h1>
          <p class="text-muted-foreground">Industry: {{ jobDetails.majorGroupTitle || industryName }}</p>
        </header>

        <section class="space-y-2">
          <h2 class="text-xl font-semibold">Job description</h2>
          <p class="text-sm md:text-base">{{ jobDescription }}</p>
        </section>

        <section class="space-y-2">
          <h2 class="text-xl font-semibold">Tasks</h2>
          <ul class="list-disc ml-6 space-y-1">
            <li v-for="(task, idx) in jobTasks" :key="idx">{{ task }}</li>
          </ul>
        </section>

        <section class="space-y-2">
          <h2 class="text-xl font-semibold">Skill level</h2>
          <p>{{ skillLevel }}</p>
        </section>
      </template>
    </div>

    <!-- Floating Job quiz bubble -->
    <button
      class="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#C65A0F] text-white shadow-lg flex items-center justify-center text-sm md:text-base font-bold"
      aria-label="Job quiz"
      title="Job quiz"
      @click="() => {}"
    >
      Job Quiz
    </button>
  </div>
</template>

<style scoped></style>


