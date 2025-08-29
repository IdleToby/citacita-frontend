<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'

type Industry = {
  id: number
  name: string
}

const router = useRouter()

// Placeholder list of 10 industries
const industries = ref<Industry[]>([
  { id: 1, name: 'Managers' },
  { id: 2, name: 'Professionals' },
  { id: 3, name: 'Technicians and Associate Professionals' },
  { id: 4, name: 'Clerical Support Workers' },
  { id: 5, name: 'Service and Sales Workers' },
  { id: 6, name: 'Skills Agricultural, Forestry, Livestock and Fishery Workers' },
  { id: 7, name: 'Craft and Related Trades Workers' },
  { id: 8, name: 'Plant and Machine Operators and Assemblers' },
  { id: 9, name: 'Elementary Occupations' },
  { id: 10, name: 'Armed Forces' },
])

function goToIndustry(industryName: string) {
  // slugify industry name for route param
  const slug = industryName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  router.push({ name: 'industry-jobs', params: { industry: slug } })
}
</script>

<template>
  <div class="w-full min-h-full bg-white text-black">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-6">Industries in Malaysia</h1>
      <p class="text-muted-foreground mb-8">Click to discover jobs available</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          v-for="industry in industries"
          :key="industry.id"
          class="group aspect-square rounded-xl border border-input bg-card hover:shadow-md transition p-4 flex items-center justify-center text-center"
          @click="goToIndustry(industry.name)"
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
      @click="() => {}"
    >
      Job Quiz
    </button>
  </div>
</template>

<style scoped></style>
