<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDetailJobByLangAndUnitGroupCode, getSkillLevelByLangAndId, getAllJobs } from '@/api'
import TestQuiz from '@/views/TestQuiz.vue'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const loading = ref(false)
const error = ref('')

const showQuizModal = ref(false)
const showSkillLevelHelper = ref(false)
const testQuizRef = ref<any>(null)

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

function toggleSkillLevelHelper() {
  showSkillLevelHelper.value = !showSkillLevelHelper.value
}

function getSkillLevelExplanation(skillLevel: string) {
  const explanations: Record<string, string> = {
    'First': 'Low-skilled. Primary education.',
    'Second': 'Semi-skilled. Secondary or post-secondary education. Malaysian Skill Certificate (SKM) Level 1 and Level 2; or equivalent.',
    'Third': 'Skilled. Diploma; or Malaysian Skill Diploma (DKM) Level 4 / Malaysian Skill Certificate (SKM) Level 3; or equivalent.',
    'Fourth': 'Skilled. PHD/Master/Degree; or Malaysian Skill Advanced Diploma (DLKM) Level 5 and above; or equivalent.',
    'Not applicable': 'Education qualification is not a prerequisite.'
  }
  return explanations[skillLevel] || 'Skill level information not available.'
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

// Helper to force reactivity on locale change
const localeRef = computed(() => locale.value)

const jobTitle = computed(() => {
  // Depend on locale to force reactivity
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentLocale = localeRef.value
  return jobDetails.value.unitGroupTitle || `Job ${jobId.value}`
})
const skillLevel = computed(() => {
    // Depend on locale to force reactivity
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentLocale = localeRef.value
  return skillDetails.value.skillLevel || jobDetails.value.skillLevel || 'Unknown'
})
const jobDescription = computed(() => {
  // Depend on locale to force reactivity
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentLocale = localeRef.value
  return jobDetails.value.unitGroupDescription || 'No description available.'
})
const jobTasks = computed(() => {
  // Force reactivity on locale change to ensure re-parsing
  const currentLocale = localeRef.value
  if (!jobDetails.value.tasksInclude) return ['No tasks available']

  console.log(`Parsing jobTasks for locale: ${currentLocale}, content: ${jobDetails.value.tasksInclude?.substring(0, 100)}...`)

  // Clean up the tasks string and convert alphabetical ordering to bullet points
  const tasksText = jobDetails.value.tasksInclude
    // Remove leading dots and spaces
    .replace(/^\s*\.\s*/gm, '')
    // Remove extra indentation (multiple spaces at start of lines)
    .replace(/^\s{2,}/gm, '')
    // Fix extra spaces after apostrophes early in the process
    .replace(/['']\s{2,}/g, "' ")
    .trim()

  // Split by alphabetical markers for both English and Chinese content
  // Look for patterns like "A)", "a)", "A）", "a）" etc.
  let cleanedTasks = []

  // First, try to split by alphabetical markers (both English and Chinese parentheses)
  const alphabeticalSplit = tasksText.split(/\s*[A-Za-z][\)）]\s*/)

  if (alphabeticalSplit.length > 1) {
    // If we found alphabetical markers, use the split result (skip first empty element)
    cleanedTasks = alphabeticalSplit.slice(1)
  } else {
    // If no alphabetical markers found, try splitting by semicolons or Chinese semicolons
    cleanedTasks = tasksText.split(/[;；]/).filter(task => task.trim().length > 0)
  }

  // Clean up each task
  cleanedTasks = cleanedTasks
    .map(task => task.trim())
    .filter(task => task.length > 0)
    // Remove any remaining alphabetical markers at the beginning
    .map(task => task.replace(/^(and\s+|和\s+)?[A-Za-z][\)）]\s*/i, '').trim())
    // Remove any remaining leading dots or periods
    .map(task => task.replace(/^[\.\s]+/, '').trim())
    .filter(task => task.length > 0)

  // Handle "and" separation for English content
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

  // Additional cleanup for incomplete parenthetical references and proper endings
  return finalTasks.map(task => {
    let cleanedTask = task

    // Remove incomplete parenthetical references like (ica, (wm, (u, etc.
    cleanedTask = cleanedTask.replace(/\s*\([a-zA-Z]{1,4}\s*$/g, '')

    // Clean up any trailing incomplete words or punctuation
    cleanedTask = cleanedTask.replace(/\s+(and|和)\s*$/, '')

    // Remove extra spaces after apostrophes (e.g., "students'     work" -> "students' work")
    // Handle both regular apostrophes and smart quotes
    cleanedTask = cleanedTask.replace(/['']\s{2,}/g, "' ")

    // Ensure proper sentence ending for non-Chinese content
    if (!cleanedTask.match(/[.;；。]$/)) {
      // If the task doesn't end with proper punctuation, add a semicolon
      cleanedTask = cleanedTask.trim() + ';'
    }

    // Capitalize the first letter of each task
    cleanedTask = cleanedTask.charAt(0).toUpperCase() + cleanedTask.slice(1)

    return cleanedTask.trim()
  }).filter(task => task.length > 1) // Filter out empty or single character tasks
})

const jobExamples = computed(() => {
  // Force reactivity on locale change to ensure re-parsing
  const currentLocale = localeRef.value
  if (!jobDetails.value.examples) return ['No examples available']

  console.log(`Parsing jobExamples for locale: ${currentLocale}, content: ${jobDetails.value.examples?.substring(0, 100)}...`)

  // Clean up the examples string
  const examplesText = jobDetails.value.examples
    // Remove leading dots and spaces
    .replace(/^\s*\.\s*/gm, '')
    // Remove extra indentation (multiple spaces at start of lines)
    .replace(/^\s{2,}/gm, '')
    // Fix character encoding issues - replace garbled apostrophe with proper single quote
    .replace(/¡¯/g, "'")
    .trim()

  // Split by common delimiters first
  let examples = examplesText.split(/[;；,，\n]/)
    .map(example => example.trim())
    .filter(example => example.length > 0)

  // If no examples found by delimiters, try splitting by 6-digit code patterns
  if (examples.length <= 1) {
    const codePattern = /(\d{4}-\d{2})/g
    const matches = [...examplesText.matchAll(codePattern)]

    if (matches.length > 0) {
      examples = []

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const matchIndex = match.index

        // Find the end of this example (either the start of the next code or end of string)
        const nextMatch = matches[i + 1]
        const endIndex = nextMatch ? nextMatch.index : examplesText.length

        // Extract the full example starting with the code
        const fullExample = examplesText.substring(matchIndex, endIndex).trim()

        if (fullExample.length > 0) {
          examples.push(fullExample)
        }
      }
    }
  }

  // Final cleanup - remove 6-digit codes, clean up, and capitalize
  return examples
    .map(example => {
      let cleanedExample = example
        // Remove 6-digit codes at the beginning (e.g., "4311-01", "4311-02")
        .replace(/^\d{4}-\d{2}\s*/, '')
        // Remove leading dots and spaces
        .replace(/^[\.\s]+/, '')
        // Remove trailing punctuation and extra whitespace
        .replace(/[;；,，\s]+$/, '')
        .trim()

      // Capitalize the first letter
      if (cleanedExample.length > 0) {
        cleanedExample = cleanedExample.charAt(0).toUpperCase() + cleanedExample.slice(1)
      }

      return cleanedExample
    })
    .filter(example => example.length > 0)
})


// Fallback function to get localized job details from getAllJobs
async function getLocalizedJobFromAllJobs(unitGroupCode: string, locale: string) {
  console.log('=== Trying fallback getAllJobs method ===')
  try {
    const response = await getAllJobs()
    if (response.data.code === 200 && Array.isArray(response.data.data)) {
      const job = response.data.data.find((job: any) => job.unitGroupCode === unitGroupCode)
      if (job) {
        console.log('Found job in getAllJobs:', job)

        // Map the appropriate language fields based on locale
        const localizedJob = { ...job }

        if (locale === 'zh-CN') {
          // Use Chinese fields if available
          localizedJob.unitGroupTitle = job.unitGroupTitleChinese || job.unitGroupTitle
          localizedJob.unitGroupDescription = job.unitGroupDescriptionChinese || job.unitGroupDescription
          localizedJob.tasksInclude = job.tasksIncludeChinese || job.tasksInclude
          localizedJob.examples = job.examplesChinese || job.examples
          localizedJob.majorGroupTitle = job.majorGroupTitleChinese || job.majorGroupTitle
          localizedJob.subMajorGroupTitle = job.subMajorGroupTitleChinese || job.subMajorGroupTitle
          localizedJob.minorGroupTitle = job.minorGroupTitleChinese || job.minorGroupTitle
          localizedJob.skillLevel = job.skillLevelChinese || job.skillLevel

          console.log('=== Chinese Localization Applied ===')
          console.log('tasksIncludeChinese:', job.tasksIncludeChinese?.substring(0, 100) + '...')
          console.log('Using tasksInclude:', localizedJob.tasksInclude?.substring(0, 100) + '...')
        } else if (locale === 'ms') {
          // Use Malay fields if available
          localizedJob.unitGroupTitle = job.unitGroupTitleMalay || job.unitGroupTitle
          localizedJob.unitGroupDescription = job.unitGroupDescriptionMalay || job.unitGroupDescription
          localizedJob.tasksInclude = job.tasksIncludeMalay || job.tasksInclude
          localizedJob.examples = job.examplesMalay || job.examples
          localizedJob.majorGroupTitle = job.majorGroupTitleMalay || job.majorGroupTitle
          localizedJob.subMajorGroupTitle = job.subMajorGroupTitleMalay || job.subMajorGroupTitle
          localizedJob.minorGroupTitle = job.minorGroupTitleMalay || job.minorGroupTitle
          localizedJob.skillLevel = job.skillLevelMalay || job.skillLevel
        }
        // For 'en' locale, use default fields (no change needed)

        return localizedJob
      }
    }
  } catch (err) {
    console.error('Error in getAllJobs fallback:', err)
  }
  return null
}

// Fetch job details from API
async function fetchJobDetails() {
  if (!unitGroupCode.value) {
    error.value = 'No job selected'
    return
  }

  console.log(`Fetching job details for locale: ${locale.value}, unitGroupCode: ${unitGroupCode.value}`)
  loading.value = true
  error.value = ''

  try {
    // First try the primary API
    const response = await getDetailJobByLangAndUnitGroupCode(locale.value, unitGroupCode.value)
    console.log('=== Primary API Response Debug ===')
    console.log('Request locale:', locale.value)
    console.log('Request unitGroupCode:', unitGroupCode.value)
    console.log('Full API response:', response.data)

    if (response.data.code === 200) {
      jobDetails.value = response.data.data
      console.log('=== Job Details Debug ===')
      console.log('jobDetails object keys:', Object.keys(jobDetails.value))
      console.log('unitGroupTitle:', jobDetails.value.unitGroupTitle)
      console.log('unitGroupDescription:', jobDetails.value.unitGroupDescription?.substring(0, 100) + '...')
      console.log('tasksInclude full content:', jobDetails.value.tasksInclude)
      console.log('examples:', jobDetails.value.examples?.substring(0, 100) + '...')
      console.log('majorGroupTitle:', jobDetails.value.majorGroupTitle)

      // Check if content appears to be in the wrong language (simple heuristic)
      const isTasksEnglish = /^[a-zA-Z\s,;.()/-]+$/.test(jobDetails.value.tasksInclude?.substring(0, 50) || '')
      const isChineseLocale = locale.value === 'zh-CN'

      console.log('Tasks appears to be English:', isTasksEnglish)
      console.log('Current locale is Chinese:', isChineseLocale)

      // If we're requesting Chinese but getting English content, try fallback
      if (isChineseLocale && isTasksEnglish && jobDetails.value.tasksInclude) {
        console.log('Primary API returned English content for Chinese locale, trying fallback...')
        const localizedJob = await getLocalizedJobFromAllJobs(unitGroupCode.value, locale.value)

        if (localizedJob) {
          console.log('Using localized job from getAllJobs fallback')
          jobDetails.value = localizedJob
        } else {
          console.log('Fallback failed, using original response')
        }
      }

      // After getting job details, fetch skill level details
      await fetchSkillDetails()
    } else {
      error.value = 'Failed to fetch job details'
      console.error('API returned non-200 code:', response.data)
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
watch(locale, (newLocale, oldLocale) => {
  console.log(`Locale changed from ${oldLocale} to ${newLocale}`)
  if (unitGroupCode.value && newLocale !== oldLocale) {
    // Clear existing data to prevent showing stale content
    jobDetails.value = {
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
    }
    skillDetails.value = {
      majorGroupCode: '',
      majorGroupTitle: '',
      educationLevel: '',
      skillLevel: ''
    }
    // Add a small delay to ensure locale change is fully processed
    setTimeout(() => {
      fetchJobDetails()
    }, 100)
  }
})

// Go back to IndustryJobsView or Quiz Results
function goBack() {
  // Check if user came from quiz results
  if (route.query.fromQuiz === 'true') {
    // Try to restore quiz results and show quiz modal
    const stored = sessionStorage.getItem('jobQuizResults')
    if (stored) {
      try {
        const quizState = JSON.parse(stored)
        // Check if results are not too old (within 2 hours)
        if (Date.now() - quizState.timestamp < 7200000) {
          // Open quiz modal and restore results
          showQuizModal.value = true
          // Wait for next tick to ensure TestQuiz component is mounted, then restore state
          nextTick(() => {
            setTimeout(() => {
              if (testQuizRef.value && testQuizRef.value.restoreQuizResults) {
                testQuizRef.value.restoreQuizResults()
              }
            }, 100) // Small delay to ensure component is fully ready
          })
          return
        }
      } catch (error) {
        console.error('Error restoring quiz results:', error)
      }
    }
    // Fallback: if quiz results unavailable, go to jobs page
    router.push({ name: 'jobs' })
  } else {
    // Normal navigation back to industry jobs view
    const majorGroupCode = route.query.majorGroupCode || jobDetails.value.majorGroupCode
    router.push({
      name: 'industry-jobs',
      params: { industry: industrySlug.value },
      query: { majorGroupCode }
    })
  }
}

// Close skill level helper when clicking outside
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.skill-level-container')) {
    showSkillLevelHelper.value = false
  }
}

onMounted(() => {
  if (unitGroupCode.value) {
    fetchJobDetails()
  }
  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="w-full min-h-screen text-white relative overflow-hidden">
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

    <div class="max-w-7xl mx-auto pl-20 pr-4 py-8 h-screen flex flex-col">
      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8 flex-1 flex items-center justify-center">
        <p class="text-white text-xl">Loading...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8 flex-1 flex items-center justify-center">
        <div>
          <p class="text-white text-xl mb-4">{{ error }}</p>
          <button
            @click="fetchJobDetails"
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Job details -->
      <template v-else>
        <!-- Top Headers -->
        <div class="flex justify-between items-start mb-6">
          <!-- Left: Unit Group Title -->
          <div class="flex-1">
            <h1 class="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {{ jobTitle }}
            </h1>
          </div>

          <!-- Right: Major Group Title + Skill Level -->
          <div class="flex-1 text-right skill-level-container relative">
            <h2 class="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
              {{ jobDetails.majorGroupTitle || industryName }}
              <span class="text-base font-normal ml-2">
                ({{ t('jobDescriptionPage.skillLevel') }}: {{ skillLevel }}
                <button
                  @click="toggleSkillLevelHelper"
                  class="ml-1 w-5 h-5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white transition-colors duration-200"
                  title="Click for skill level explanation"
                >
                  ?
                </button>
                )
              </span>
            </h2>

            <!-- Skill Level Helper Tooltip -->
            <div
              v-if="showSkillLevelHelper"
              class="absolute right-0 mt-2 max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-left z-50"
              @click.stop
            >
              <div class="text-sm text-gray-800">
                <p>{{ getSkillLevelExplanation(skillLevel) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Job Description Card -->
        <div class="mb-6">
          <div class="bg-blue-100/90 backdrop-blur-sm rounded-lg p-6 border border-blue-200">
            <h3 class="text-xl font-semibold text-gray-800 mb-3">{{ t('jobDescriptionPage.jobDescription') }}</h3>
            <p class="text-gray-700 text-base leading-relaxed">{{ jobDescription }}</p>
          </div>
        </div>

        <!-- Bottom Cards: Tasks and Examples -->
        <div class="flex gap-6">
          <!-- Tasks Card (2/3 width) -->
          <div class="flex-[2]">
            <div class="bg-white/95 backdrop-blur-sm rounded-lg p-6 border border-gray-200 flex flex-col" style="height: 400px;">
              <h3 class="text-xl font-semibold text-gray-800 mb-4">{{ t('jobDescriptionPage.tasks') }}</h3>
              <div class="flex-1 overflow-hidden">
                <div class="h-full overflow-y-auto pr-2">
                  <ul class="list-disc ml-6 space-y-2 text-gray-700">
                    <li v-for="(task, idx) in jobTasks" :key="idx" class="leading-relaxed">{{ task }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Examples Card (1/3 width) -->
          <div class="flex-1">
            <div class="bg-white/95 backdrop-blur-sm rounded-lg p-6 border border-gray-200 flex flex-col" style="height: 400px;">
              <h3 class="text-xl font-semibold text-gray-800 mb-4">{{ t('jobDescriptionPage.examples') }}</h3>
              <div class="flex-1 overflow-hidden">
                <div class="h-full overflow-y-auto pr-2">
                  <ul class="list-disc ml-6 space-y-2 text-gray-700">
                    <li v-for="(example, idx) in jobExamples" :key="idx" class="leading-relaxed">{{ example }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
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
