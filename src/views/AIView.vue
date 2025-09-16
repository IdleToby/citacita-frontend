<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const router = useRouter()
</script>

<template>
  <div
    class="relative z-10 flex h-full w-full flex-col items-center justify-center space-y-20 text-center text-[#292D49] border-none bg-white/70 shadow-lg backdrop-blur-md px-[10%] py-4"
  >
    <div class="flex items-center justify-center flex-col space-y-12 px-[10%]">
      <img src="@/assets/citacita-b.png" alt="AI Support" class="h-20" />
      <p class="font-noto text-2xl" v-html="t('AIPage.p1')"></p>
      <p class="font-noto text-xl">
        {{ t('AIPage.p2') }}
      </p>
      <p class="font-noto text-xl">
        {{ t('AIPage.p3') }}
      </p>
    </div>
    <!--    cards-->
    <div class="w-full flex items-stretch justify-between space-x-5 text-start">
      <div
        class="flex bg-white rounded-lg shadow-md p-6 hover:scale-105 transition-transform cursor-pointer"
        @click="router.push('/ai/resume-checker')"
      >
        <div class="flex flex-col">
          <p class="text-2xl font-bold">{{ t('AIPage.checker') }}</p>
          <div class="">{{ t('AIPage.checkerDesc') }}</div>
        </div>
        <img src="@/assets/arrow-with-circle.png" class="h-6 inline-block ml-2" alt="arrow" />
      </div>
      <div
        class="flex items-baseline bg-white rounded-lg shadow-md p-6 hover:scale-105 transition-transform cursor-pointer"
        @click="router.push('/ai/guide')"
      >
        <div class="flex flex-col">
          <p class="text-2xl font-bold">{{ t('AIPage.guide') }}</p>
          <div class="">{{ t('AIPage.guideDesc') }}</div>
        </div>
        <img src="@/assets/arrow-with-circle.png" class="h-6 inline-block ml-2" alt="arrow" />
      </div>
      <div
        class="flex items-baseline bg-white rounded-lg shadow-md p-6 hover:scale-105 transition-transform cursor-pointer"
        @click="router.push('/ai/mock-interview')"
      >
        <div class="flex flex-col">
          <p class="text-2xl font-bold">{{ t('AIPage.interview') }}</p>
          <div class="">{{ t('AIPage.interviewDesc') }}</div>
        </div>
        <img src="@/assets/arrow-with-circle.png" class="h-6 inline-block ml-2" alt="arrow" />
      </div>
    </div>
  </div>
</template>

<style></style>
