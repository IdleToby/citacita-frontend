<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const searchQuery = ref('')
const handleSearch = () => {
  //Route to products page with search query
  router.push({ path: '/products', query: { search: searchQuery.value.trim() } })
}

// randomly return one the four values: "Mercury", "Hydroquinone", "Tretinoin", "Steroid"
const unsafeIngredients = ['Mercury', 'Hydroquinone', 'Tretinoin', 'Steroid']
const timestamp = Date.now()
const randomIngredient = unsafeIngredients[timestamp % unsafeIngredients.length]
const handleSuggestionClick = () => {
  router.push({
    name: 'IngredientsDetailView',
    params: { ingredientName: encodeURIComponent(randomIngredient) },
  })
}
</script>

<template>
  <div class="flex flex-col justify-center items-center h-full shadow-lg">
    <p class="font-poppins text-[3rem] text-white">Are Your Products</p>
    <p
      class="font-poppins text-[10rem] text-[#C20000] font-[1000] tracking-wider text-shadow-lg/25"
    >
      SAFE?
    </p>
    <div class="relative w-[40rem] items-center bg-white rounded-3xl">
      <Input
        v-model="searchQuery"
        id="search"
        type="text"
        placeholder="Ex. Notification Number, Product Name, Company Name"
        class="px-10 h-20 rounded-3xl text-4xl"
        @keyup.enter="handleSearch"
      />
      <span
        class="absolute end-0 inset-y-0 flex items-center justify-center px-4 cursor-pointer"
        @click="handleSearch"
      >
        <Search class="size-8 text-muted-black" />
      </span>
    </div>
  </div>
  <hr class="h-2 bg-gradient-to-b from-gray-400 to-white border-none" />
  <div class="h-1/2 bg-white flex flex-col justify-center items-center gap-10">
    <p class="font-poppins text-4xl">Do you use this Popular Unsafe Ingredient?</p>
    <p
      class="font-poppins text-6xl text-[#C20000] font-bold cursor-pointer hover:underline"
      @click="handleSuggestionClick"
    >
      {{ randomIngredient }}
    </p>
    <RouterLink class="flex justify-center items-center gap-4 cursor-pointer" to="/ingredients">
      <div class="size-6 rounded-full bg-black"></div>
      <p class="font-poppins text-2xl font-bold underline">CHECK OUT MORE UNSAFE INGREDIENTS</p>
    </RouterLink>
  </div>
  <img
    src="@/assets/left-compressed.png"
    alt="Left background"
    class="fixed bottom-0 -left-10 w-1/4 h- z-0 scale-x-[-1]"
  />
  <img
    src="@/assets/right-compressed.png"
    alt="Right background"
    class="fixed bottom-0 -right-20 w-1/3 z-0"
  />
</template>
