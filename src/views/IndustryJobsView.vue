<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'

type Job = {
  id: number
  title: string
  location?: string
}

const route = useRoute()
const router = useRouter()

// derive industry from slug
const industrySlug = computed(() => String(route.params.industry || 'industry'))
const industryName = computed(() =>
  industrySlug.value
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
)

// placeholder 10 job titles (for job search/autocomplete)
const jobTitlePool = [
  'Farmer',
  'Accountant',
  'Software Engineer',
  'Teacher',
  'Nurse',
  'Sales Associate',
  'Mechanic',
  'Construction Worker',
  'Machine Operator',
  'Security Guard',
]
const jobs = ref<Job[]>(jobTitlePool.map((title, i) => ({ id: i + 1, title })))

const jobQuery = ref('')

const filteredJobs = computed(() => {
  const q = jobQuery.value.trim().toLowerCase()
  if (!q) return jobs.value
  return jobs.value.filter((j) => j.title.toLowerCase().startsWith(q))
})

const suggestions = computed(() => {
  const q = jobQuery.value.trim().toLowerCase()
  if (!q) return [] as string[]
  return jobTitlePool.filter((t) => t.toLowerCase().startsWith(q)).slice(0, 5)
})

function chooseSuggestion(t: string) {
  jobQuery.value = t
}

function goToJob(jobId: number) {
  router.push({ name: 'job-description', params: { industry: industrySlug.value, jobId } })
}

function onJobQuizClick() {
  // Placeholder – same behavior as the floating bubble for now
}
</script>

<template>
  <div class="w-full min-h-full bg-white text-black">
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold">Jobs in Malaysia</h1>
          <p class="text-muted-foreground">Industry: {{ industryName }}</p>
        </div>
        <div class="w-full md:w-80 relative">
          <Input v-model="jobQuery" placeholder="Search jobs..." />
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
          @click="onJobQuizClick"
        >
          here
        </button>
        to take our job quiz!
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
      @click="onJobQuizClick"
    >
      Job Quiz
    </button>
  </div>
</template>

<style scoped></style>


