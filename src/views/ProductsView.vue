// src/views/ProductsView.vue
<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { onMounted, ref, watch } from 'vue'
import { searchProducts } from '@/api'
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { DropdownMenuCheckboxItemProps } from 'reka-ui'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'

const route = useRoute()
const router = useRouter()
const searchParams = ref({
  searchTerm: '',
  pageNum: 1,
  pageSize: 10,
  filter: {
    showSafe: true,
    showUnsafe: true,
  },
} as any)
const productsList = ref([] as any)
const total = ref(0)

const loading = ref(true)
const updateList = () => {
  loading.value = true
  searchProducts(searchParams.value)
    .then((response: any) => {
      // Handle the response
      productsList.value = response.data
      total.value = response.total
      loading.value = false
    })
    .catch((error) => {
      console.error('Error fetching products:', error)
    })
}

const handleSearch = () => {
  searchParams.value.searchTerm = searchParams.value.searchTerm.trim()
  router.push({ path: '/products', query: { search: searchParams.value.searchTerm.trim() } })
  updateList()
}

const handleProductNameClick = (notifNo: string) => {
  // Navigate to the product details page with the product name
  router.push({
    name: 'productDetail',
    params: { notifNo: notifNo },
  })
}

type Checked = DropdownMenuCheckboxItemProps['modelValue']
const showSafe = ref<Checked>(true)
const showUnsafe = ref<Checked>(true)

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

//watch the changes of the filter checkboxes
watch([showSafe, showUnsafe], () => {
  searchParams.value.filter.showSafe = showSafe.value
  searchParams.value.filter.showUnsafe = showUnsafe.value
  updateList()
})

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
    <p class="font-poppins text-white text-6xl">PRODUCTS</p>

    <!--    Search bar & dropdown filter-->
    <div class="flex items-center self-end gap-4">
      <div class="relative w-[30rem] bg-white rounded-3xl">
        <Input
          v-model="searchParams.searchTerm"
          id="search"
          type="text"
          placeholder="Ex. Notification Number, Product Name, Company Name"
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
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            class="bg-transparent h-full rounded-full border-none hover:bg-[#a14724] shadow-none"
          >
            <img src="@/assets/filter-icon.svg" alt="Filter" class="size-8" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56">
          <DropdownMenuLabel>Safety Level</DropdownMenuLabel>
          <DropdownMenuCheckboxItem v-model:model-value="showSafe">Safe</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem v-model:model-value="showUnsafe"
            >Unsafe
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!--    Skeleton-->
    <div v-if="loading" class="h-[20rem] w-full bg-white flex flex-col items-center justify-center">
      <div
        class="size-16 border-4 border-gray-300 border-t-[#a14724] rounded-full animate-spin"
      ></div>
    </div>

    <!--    Table-->
    <div v-else class="h-[20rem] w-full">
      <div v-if="total !== 0" class="bg-white h-[20rem] w-full overflow-y-scroll">
        <Table>
          <TableHeader class="h-15 text-lg">
            <TableRow>
              <TableHead class="w-15"></TableHead>
              <TableHead class="font-bold text-black">Notification Number</TableHead>
              <TableHead class="font-bold text-black">Product Name</TableHead>
              <TableHead class="font-bold text-black">Company Name</TableHead>
              <TableHead class="font-bold text-black">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(item, index) in productsList"
              :key="index"
              class="h-15 text-lg text-[#171717]"
            >
              <TableCell class="text-right"
                >{{ (currentPage - 1) * searchParams.pageSize + index + 1 }}
              </TableCell>
              <TableCell
                class="underline cursor-pointer hover:text-blue-600 transition-colors"
                @click="handleProductNameClick(item.notifNo)"
                >{{ item.notifNo }}
              </TableCell>
              <TableCell>{{ item.product }}</TableCell>
              <TableCell>{{ item.company }}</TableCell>
              <TableCell>
                <Badge
                  v-if="item.status === false"
                  class="text-lg bg-[#C20000] text-white font-bold w-20"
                >
                  Unsafe
                </Badge>
                <Badge v-else class="text-lg bg-[#00A000] text-white font-bold w-20"> Safe</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div
        v-else
        class="text-gray-500 h-[20rem] flex flex-col items-center justify-center gap-6 bg-white w-full"
      >
        <p class="text-4xl text-black font-bold">Your product was not found</p>
        <p>Please try again with different keywords or filters.</p>
      </div>
    </div>

    <!--    Pagination-->
    <div :class="['bg-transparent self-end', total === 0 ? 'invisible' : 'visible']">
      <Pagination v-model:page="currentPage" v-slot="{ page }" :items-per-page="10" :total="total">
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

  <!--  footer-->
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
