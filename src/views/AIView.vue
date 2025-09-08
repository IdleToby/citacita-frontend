<script setup lang="ts">
import {nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {marked} from 'marked'
import hljs from 'highlight.js'
import {Button} from "@/components/ui/button";

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  htmlContent?: string
}

// Marked configuration for parsing Markdown and highlighting code
marked.use({
  walkTokens(token) {
    if (token.type === 'code') {
      const language = hljs.getLanguage(token.lang) ? token.lang : 'plaintext';
      token.text = hljs.highlight(token.text, {language}).value;
    }
  },
});

marked.setOptions({
  langPrefix: 'hljs language-',
  gfm: true,
  breaks: true, // Render line breaks as <br>
});

const userMessage = ref<string>('')
const messages = ref<Message[]>([])
const isLoading = ref<boolean>(false)
const chatWindow = ref<HTMLDivElement | null>(null)
let controller: AbortController | null = null;
const copiedMessageId = ref<number | null>(null);

const copyToClipboard = (text: string, messageId: number) => {
  navigator.clipboard.writeText(text).then(() => {
    copiedMessageId.value = messageId;
    setTimeout(() => {
      copiedMessageId.value = null;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};


const cleanupStream = () => {
  if (controller) {
    controller.abort()
    controller = null
  }
  isLoading.value = false

  const lastMessage = messages.value[messages.value.length - 1]
  if (lastMessage?.role === 'assistant' && lastMessage.content) {
    lastMessage.htmlContent = marked(lastMessage.content) as string
  }
}

const appendToAssistant = (chunk: string) => {
  if (!chunk) return
  const last = messages.value[messages.value.length - 1]
  if (last?.role === 'assistant') {
    last.content += chunk
  }
}

const extractText = (raw: string): string => {
  try {
    const data = JSON.parse(raw)
    if (data?.choices && Array.isArray(data.choices)) {
      const c = data.choices[0]
      if (c?.delta?.content) return String(c.delta.content)
      if (c?.message?.content) return String(c.message.content)
      if (typeof c?.text === 'string') return c.text
    }
    return ''
  } catch {
    return raw
  }
}

const sendMessage = async () => {
  const messageText = userMessage.value.trim()
  if (!messageText || isLoading.value) return

  cleanupStream()

  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: messageText
  })

  messages.value.push({
    id: Date.now() + 1,
    role: 'assistant',
    content: ''
  })

  isLoading.value = true
  userMessage.value = ''

  controller = new AbortController()
  const payload = {
    messages: messages.value
      .filter(m => !(m.role === 'assistant' && m.content === ''))
      .map(m => ({
        role: m.role,
        content: m.content
      })),
    model: 'gpt-oss-120b',
    stream: true
  }

  try {
    const resp = await fetch('/api/stream-chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('Response body is not readable.')

    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data === '[DONE]') {
            cleanupStream()
            return
          }
          const chunk = extractText(data)
          appendToAssistant(chunk)
        }
      }
    }
    cleanupStream()
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      console.error('An error occurred during streaming:', err)
      appendToAssistant('\n\n[Sorry, an error occurred. Please try again.]')
    }
    cleanupStream()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    chatWindow.value?.scrollTo({top: chatWindow.value.scrollHeight, behavior: 'smooth'})
  })
}
watch(messages, scrollToBottom, {deep: true})

onBeforeUnmount(() => {
  cleanupStream()
})
</script>

<template>
  <div
    class="relative z-10 flex h-full w-full flex-col border-none bg-white/70 shadow-lg backdrop-blur-md px-[20%] py-4"
  >
    <div class="flex items-center justify-between px-4 py-3 text-gray-800">
      <h2 class="text-lg font-semibold">Website Guidance</h2>
      <Button
        @click="messages = []; userMessage = ''; cleanupStream()"
        class="bg-blue-600 text-white hover:bg-blue-700"
        :disabled="isLoading"
        v-show="messages.length > 0 || userMessage.trim() !== '' || isLoading"
      >
        Start New Chat
      </Button>
    </div>

    <div ref="chatWindow" class="chat-window flex-1 space-y-4 overflow-y-auto p-4 relative">
      <template v-if="messages.length > 0">
        <div
          v-for="m in messages"
          :key="m.id"
          class="flex w-full"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="message-bubble group relative max-w-[80%] rounded-xl px-3 py-2 shadow-sm"
            :class="m.role === 'user'
              ? 'bg-[#292D49C4]/70 text-white rounded-br-none'
              : 'bg-gray-200/70 text-gray-900 rounded-bl-none'"
          >
            <!--            <span class="mb-0.5 block text-[11px] font-semibold opacity-70">-->
            <!--              {{ m.role === 'user' ? 'You' : 'AI' }}-->
            <!--            </span>-->

            <!-- Copy Button -->
            <button
              v-if="m.role === 'assistant' && m.content"
              @click="copyToClipboard(m.content, m.id)"
              class="absolute top-1 right-1 p-1 rounded-md bg-gray-500/20 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-gray-500/40"
              aria-label="Copy message"
            >
              <svg v-if="copiedMessageId === m.id" xmlns="http://www.w3.org/2000/svg"
                   class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                   stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>


            <div
              v-if="m.htmlContent"
              v-html="m.htmlContent"
              class="prose prose-sm max-w-none prose-p:my-0 prose-li:my-0 prose-pre:bg-gray-800/80 prose-pre:text-gray-200 prose-code:before:content-none prose-code:after:content-none"
            ></div>
            <p v-else class="m-0 whitespace-pre-wrap break-words">
              {{ m.content }}
              <span
                v-if="isLoading && m.id === messages[messages.length - 1]?.id"
                class="ml-1 inline-block h-5 w-2 animate-pulse align-text-bottom bg-current"
              />
            </p>
          </div>
        </div>
      </template>

      <div v-else class="flex h-full flex-col items-center justify-center text-gray-500">
        <p class="text-base">Start a conversation!</p>
      </div>

      <!-- Streaming Indicator -->
      <div
        v-if="isLoading"
        class="pointer-events-none justify-self-end rounded w-auto h-15 transition-opacity opacity-100"
      >
        <div class="flex items-center justify-center p-2 rounded-full bg-gray-400/30">
          <svg class="loading-dots text-gray-700" width="28" height="28" viewBox="0 0 24 24"
               fill="none" aria-hidden="true">
            <circle cx="6" cy="12" r="2" fill="currentColor"></circle>
            <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
            <circle cx="18" cy="12" r="2" fill="currentColor"></circle>
          </svg>
        </div>
      </div>
    </div>

    <form class="flex items-center gap-2 p-3" @submit.prevent="sendMessage">
      <div
        class="relative flex w-full items-center rounded-full bg-gray-100/80 px-4 py-2 shadow-inner cursor-pointer">
        <button type="button" class="text-gray-600 hover:text-blue-600 focus:outline-none mr-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        <input
          v-model="userMessage"
          :disabled="isLoading"
          type="text"
          placeholder="type here to chat..."
          class="flex-1 border-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
          autocomplete="off"
          @keydown.enter.prevent="sendMessage"
        />

        <button type="button"
                class="text-gray-600 hover:text-blue-600 focus:outline-none ml-2 cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      </div>

      <button
        :disabled="isLoading || !userMessage.trim()"
        type="submit"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13 5l7 7-7 7M5 12h14"
          />
        </svg>
      </button>
    </form>
  </div>
</template>

<style>
/* 覆盖 prose 插件的默认边距，使其在聊天气泡中更好看 */
.prose :first-child {
  margin-top: 0;
}

.prose :last-child {
  margin-bottom: 0;
}

/* 移除 prose 插件给代码块两端加的引号 */
.prose code::before,
.prose code::after {
  content: none !important;
}

/* 调整 highlight.js 代码块的滚动条，如果代码很长 */
.hljs {
  overflow-x: auto;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: rgb(31 41 55 / 0.8) !important;
}

/* --- New Styles --- */

/* 美化滚动条 */
.chat-window::-webkit-scrollbar {
  width: 6px;
}

.chat-window::-webkit-scrollbar-track {
  background: transparent;
}

.chat-window::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 3px solid transparent;
}

.chat-window::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.4);
}

/* 呼吸动画 */
@keyframes dotFlashing {
  0% {
    opacity: 0.25;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-1px);
  }
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
}

.loading-dots circle {
  animation: dotFlashing 1.2s infinite ease-in-out;
}

.loading-dots circle:nth-child(1) {
  animation-delay: 0s;
}

.loading-dots circle:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots circle:nth-child(3) {
  animation-delay: 0.4s;
}

</style>
