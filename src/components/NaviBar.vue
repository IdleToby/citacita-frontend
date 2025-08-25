<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const isActive = (path: string) => route.path === path
</script>

<template>
  <div
    class="flex justify-between items-center  rounded-3xl text-white bg-white/20 backdrop-blur-md border border-white/30 shadow-md mx-4 py-2"
  >
    <RouterLink to="/" class="font-paytone text-shadow-lg hover flex items-center px-4 py-2 rounded-lg">
      <img src="@/assets/citacita-w.png" alt="Logo" class="h-10 inline-block mx-4" />
      <!--      <span class="font-paytone text-shadow-lg text-3xl font-bold">Cita-Cita</span>-->
    </RouterLink>

    <div class="flex-1"></div>

    <RouterLink
      to="/jobs"
      class="font-paytone text-shadow-lg text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/jobs') ? ' text-[#FFB076]' : ''"
    >
      Jobs for Me
    </RouterLink>
    <RouterLink
      to="/assistance"
      class="font-paytone text-shadow-lg text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/assistance') ? ' text-[#FFB076]' : ''"
    >
      Financial Assistance
    </RouterLink>
    <RouterLink
      to="/ai"
      class="font-paytone text-shadow-lg text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/ai') ? ' text-[#FFB076]' : ''"
    >
      AI Tools
    </RouterLink>
    <RouterLink
      to="/map"
      class="font-paytone text-shadow-lg text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/map') ? ' text-[#FFB076]' : ''"
    >
      Map
    </RouterLink>
    <RouterLink
      to="/faq"
      class="font-paytone text-shadow-lg text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/faq') ? ' text-[#FFB076]' : ''"
    >
      FAQ
    </RouterLink>
  </div>
</template>

<style scoped></style>
