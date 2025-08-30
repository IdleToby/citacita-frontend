<script setup lang="ts">
import NaviBar from '@/components/NaviBar.vue'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
import { nextTick, onMounted, ref, computed } from 'vue'   // ★ 新增 computed
import { useRoute } from 'vue-router'                      // ★ 新增 useRoute

const headerRef = ref<HTMLElement | null>(null)
const headerHeight = ref(0)

const route = useRoute()                                   // ★ 新增
const isHome = computed(() => route.name === 'home')       // ★ 新增：是否首页

onMounted(async () => {
  await nextTick()
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
  }
})
</script>

<template>
  <!-- ★ 改动：只有非首页才加全局背景 -->
  <div class="app-layout font-noto" :class="{ 'app-has-bg': !isHome }">
    <header ref="headerRef" class="fixed-header p-4 z-30"><!-- ★ 加 z-30 -->
      <NaviBar />
    </header>

    <!-- ★ 加 relative z-10，让内容在 header 下面 -->
    <main class="main-content relative z-10" :style="{ paddingTop: `${headerHeight}px` }">
      <router-view />
    </main>
  </div>
  <Toaster position="top-center" richColors />
</template>

<style scoped lang="scss">
.app-layout {
  height: 100vh;
}

/* ★ 改动：把原本写在 .app-layout 的背景挪到条件类 .app-has-bg */
.app-has-bg {
  background-image: url('/images/ai-tools.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.5); /* 半透明背景 */
}

.main-content {
  height: 100%;
  overflow-y: auto;
}
</style>
