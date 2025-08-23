<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const isActive = (path: string) => route.path === path
</script>

<template>
  <div
    class="flex justify-between items-center border-solid border-4 border-white rounded-3xl text-white m-4"
  >
    <RouterLink
      to="/"
      class="font-poppins hover flex items-center px-4 py-2 rounded-lg"
    >
      <img src="@/assets/logo-white.png" alt="Logo" class="size-8 inline-block mr-2" />
      <span class="font-poppins text-4xl font-bold">COSCHECK</span>
    </RouterLink>

    <div class="flex-1"></div>

    <RouterLink
      to="/"
      class="font-poppins text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/') ? 'bg-white text-[#a14724]' : ''"
    >
      CHECK
    </RouterLink>

    <RouterLink
      to="/products"
      class="font-poppins text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/products') ? 'bg-white text-[#a14724]' : ''"
    >
      PRODUCTS
    </RouterLink>

    <RouterLink
      to="/ingredients"
      class="font-poppins text-3xl hover:underline mx-12 px-6 py-1 rounded-4xl"
      :class="isActive('/ingredients') ? 'bg-white text-[#a14724]' : ''"
    >
      UNSAFE INGREDIENTS
    </RouterLink>
  </div>
</template>

<style scoped></style>
