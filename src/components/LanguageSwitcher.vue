<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'
import { Languages } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const { locale, availableLocales } = useI18n()

watch(locale, (newLocale) => {
  localStorage.setItem('user-locale', newLocale)
})

const languageNames: Record<string, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  ms: 'Bahasa Melayu',
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        class="relative h-10 w-10 rounded-full border border-white/30 bg-white/10 p-0 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Languages class="h-5 w-5" />
        <span class="sr-only">Toggle language</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="lang in availableLocales"
        :key="lang"
        @click="locale = lang"
      >
        {{ languageNames[lang] || lang }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
