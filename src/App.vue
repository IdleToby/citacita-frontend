<template>
  <div class="background">
    <NaviBar />
    <main class="flex-1 flex flex-col">
      <router-view />
    </main>
  </div>
  <Toaster position="top-center" richColors />

  <!--  <div>-->
  <!--    <Button @click="handleClick">{{ message }}</Button>-->
  <!--  </div>-->
</template>

<script setup lang="ts">
import NaviBar from '@/components/NaviBar.vue'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
// import { ref } from 'vue'
// import { Button } from '@/components/ui/button'
// import { hello } from '@/api/hello'
//
// const message = ref('click me')
//
// const handleClick = () => {
//   hello()
//     .then((res) => {
//       message.value = res.data
//     })
//     .catch(() => {})
// }
</script>

<style scoped>
.background {
  background: linear-gradient(to bottom, #a14724, #fcfcfc);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
