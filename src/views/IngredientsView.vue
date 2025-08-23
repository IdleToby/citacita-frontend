//src/views/IngredientsView.vue
<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { onMounted, ref, watch } from 'vue'
import { searchIngredients } from '@/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const route = useRoute()
const router = useRouter()
const searchParams = ref({
  searchTerm: '',
  pageNum: 1,
  pageSize: 10,
} as any)

const ingredientsList = ref([] as any)
const total = ref(0)

const updateList = () => {
  loading.value = true
  searchIngredients(searchParams.value)
    .then((response: any) => {
      // Handle the response
      ingredientsList.value = response.data
      total.value = response.total
      loading.value = false
    })
    .catch((error) => {
      console.error('Error fetching ingredients:', error)
    })
}

const handleSearch = () => {
  searchParams.value.searchTerm = searchParams.value.searchTerm.trim()
  router.push({ path: '/ingredients', query: { search: searchParams.value.searchTerm.trim() } })
  searchParams.value.pageNum = 1 // 重置到第一页
  updateList()
}

// 点击成分名称跳转到详情页 - 修复路由名称
const handleIngredientNameClick = (ingredientName: string) => {
  router.push({
    name: 'IngredientsDetailView',
    params: { ingredientName: encodeURIComponent(ingredientName) },
  })
}

const currentPage = ref(1)

const unsafeIngredients = ['Mercury', 'Hydroquinone', 'Tretinoin', 'Steroid']
const timestamp = Date.now()
const randomIngredient = unsafeIngredients[timestamp % unsafeIngredients.length]
const handleSuggestionClick = () => {
  router.push({
    name: 'IngredientsDetailView',
    params: { ingredientName: encodeURIComponent(randomIngredient) },
  })
}

const loading = ref(true)

// 监听页码变化
watch(currentPage, (newPageNum) => {
  searchParams.value.pageNum = newPageNum
  updateList()
})

onMounted(() => {
  searchParams.value.searchTerm = (route.query.search as string) || ''
  updateList()
})
</script>

<template>
  <div class="w-[95%] flex flex-col items-center justify-center mx-auto h-full gap-4 font-poppins">
    <!-- 页面标题 -->
    <p class="font-poppins text-white text-6xl">UNSAFE INGREDIENTS</p>

    <!-- 搜索栏 -->
    <div class="flex items-center self-end gap-4">
      <div class="relative w-[30rem] bg-white rounded-3xl">
        <Input
          v-model="searchParams.searchTerm"
          id="search"
          type="text"
          placeholder="Ex. Ingredient Name"
          class="px-10 h-15 rounded-3xl text-4xl"
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

    <!--    Skeleton-->
    <div v-if="loading" class="h-[20rem] w-full bg-white flex flex-col items-center justify-center">
      <div
        class="size-16 border-4 border-gray-300 border-t-[#a14724] rounded-full animate-spin"
      ></div>
    </div>

    <!-- 表格 - 只显示2列：序号和 Ingredient Name -->
    <div v-else class="h-[20rem] w-full">
      <div v-if="ingredientsList.length > 0" class="bg-white h-[20rem] w-full overflow-y-scroll">
        <Table>
          <TableHeader class="h-15 text-lg">
            <TableRow>
              <TableHead class="w-20 text-center"></TableHead>
              <TableHead class="font-bold text-black">Ingredient Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(item, index) in ingredientsList"
              :key="index"
              class="h-15 text-lg text-[#171717] hover:bg-gray-50"
            >
              <TableCell class="text-center w-20">
                {{ (currentPage - 1) * searchParams.pageSize + index + 1 }}
              </TableCell>
              <TableCell
                class="underline cursor-pointer hover:text-blue-600 transition-colors"
                @click="handleIngredientNameClick(item.substanceDetected)"
              >
                {{ item.substanceDetected }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- 空状态显示 -->
      <div
        v-else
        class="text-gray-500 h-[20rem] flex flex-col items-center justify-center gap-6 bg-white w-full"
      >
        <p class="text-4xl text-black font-bold">Your ingredient was not found</p>
        <p>Please try again with different keywords.</p>
      </div>
    </div>

    <!-- 分页组件 -->
    <div
      :class="['bg-transparent self-end', ingredientsList.length === 0 ? 'invisible' : 'visible']"
    >
      <Pagination
        v-model:page="currentPage"
        v-slot="{ page }"
        :items-per-page="searchParams.pageSize"
        :total="total"
      >
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious />

          <template v-for="(item, index) in items" :key="index">
            <PaginationItem
              v-if="item.type === 'page'"
              :value="item.value"
              :is-active="item.value === page"
            >
              {{ item.value }}
            </PaginationItem>
          </template>

          <PaginationEllipsis :index="4" />

          <PaginationNext />
        </PaginationContent>
      </Pagination>
    </div>
  </div>

  <!-- 页脚 -->
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
</template>

<style scoped></style>
