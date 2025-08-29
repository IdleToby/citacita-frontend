<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const industrySlug = computed(() => String(route.params.industry || 'industry'))
const jobId = computed(() => String(route.params.jobId || '0'))

const industryName = computed(() =>
  industrySlug.value
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
)

// Placeholder fields
const jobTitle = computed(() => `Job ${jobId.value}`)
const jobDescription = 'No description yet.'
const jobTasks = ['']
const skillLevel = 'Unknown'
</script>

<template>
  <div class="w-full min-h-full bg-white text-black">
    <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header class="space-y-1">
        <h1 class="text-3xl md:text-4xl font-bold">{{ jobTitle }}</h1>
        <p class="text-muted-foreground">Industry: {{ industryName }}</p>
      </header>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Job description</h2>
        <p class="text-sm md:text-base">{{ jobDescription }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Tasks</h2>
        <ul class="list-disc ml-6 space-y-1">
          <li v-for="(task, idx) in jobTasks" :key="idx">{{ task || 'To be added' }}</li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Skill level</h2>
        <p>{{ skillLevel }}</p>
      </section>
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


