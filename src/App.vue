<script setup lang="ts">
import NaviBar from '@/components/NaviBar.vue'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
import { nextTick, onMounted, ref } from 'vue'

const headerRef = ref<HTMLElement | null>(null)
const headerHeight = ref(0)

// get header height on mounted
onMounted(async () => {
  await nextTick()
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
  }
})
</script>

<template>
  <div class="app-layout">
    <header ref="headerRef" class="fixed-header p-4">
      <NaviBar />
    </header>

    <main class="main-content" :style="{ paddingTop: `${headerHeight}px` }">
      <!--    <main class="main-content" :style="{ paddingTop: `0px` }">-->
      <router-view />
    </main>
  </div>
  <Toaster position="top-center" richColors />
</template>

<style scoped lang="scss">
.app-layout {
  height: 100vh;
  background-image: url('@/assets/homepage/HomePage_1.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  //make background picture dark
  background-color: rgba(0, 0, 0, 0.2);
  background-blend-mode: darken;
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  background: transparent;
}

.main-content {
  height: 100%;
  overflow-y: auto;
}
</style>
