<script setup lang="ts">
import {nextTick, onBeforeUnmount, ref, watch} from 'vue'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const userMessage = ref<string>('')
const messages = ref<Message[]>([])
const isLoading = ref<boolean>(false)
const chatWindow = ref<HTMLDivElement | null>(null)
let controller: AbortController | null = null

// ---- helpers ----
const cleanupStream = () => {
  if (controller) {
    controller.abort()
    controller = null
  }
  isLoading.value = false
}

const appendToAssistant = (chunk: string) => {
  if (!chunk) return
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'assistant') {
    last.content += chunk
  }
}

const extractText = (raw: string): string => {
  try {
    const data = JSON.parse(raw)
    if (data?.choices && Array.isArray(data.choices)) {
      const c = data.choices[0]
      if (c?.delta?.content) return String(c.delta.content)
      // if (c?.delta?.reasoning_content) return String(c.delta.reasoning_content)
      if (c?.message?.content) return String(c.message.content)
      if (typeof c?.text === 'string') return c.text
    }
    return ''
  } catch {
    return raw
  }
}

// ---- send message ----
const sendMessage = async () => {
  const messageText = userMessage.value.trim()
  if (!messageText || isLoading.value) return

  cleanupStream()

  // User message
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: messageText
  })

  // 2. Append empty assistant message for streaming
  messages.value.push({
    id: Date.now() + 1,
    role: 'assistant',
    content: ''
  })

  isLoading.value = true
  userMessage.value = ''

  // 3. send to backend with all history for context
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
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      buffer += decoder.decode(value, {stream: true})
      let lines = buffer.split('\n')
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
  } catch (err) {
    appendToAssistant('\n\n[Sorry, an error occurred. Please try again.]')
    cleanupStream()
  }
}

// Auto scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (chatWindow.value) {
      chatWindow.value.scrollTop = chatWindow.value.scrollHeight
    }
  })
}
watch(messages, scrollToBottom, {deep: true})

onBeforeUnmount(() => {
  cleanupStream()
})
</script>

<template>
  <div class="mx-auto my-8 h-[80vh] max-w-2xl flex flex-col rounded-2xl border bg-white shadow-sm">
    <!-- Title -->
    <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
      <h2 class="text-lg font-semibold text-gray-800">Conversation View</h2>
      <span
        class="inline-flex items-center gap-2 text-xs text-gray-500"
        :class="{ 'opacity-100': isLoading, 'opacity-0': !isLoading }"
      >
        <span class="relative inline-flex h-2 w-2">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
        </span>
        streaming
      </span>
    </div>

    <!-- Conversation -->
    <div ref="chatWindow" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
      <template v-if="messages.length > 0">
        <div
          v-for="m in messages"
          :key="m.id"
          class="flex w-full"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-2xl px-3 py-2 shadow"
            :class="m.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-200 text-gray-900 rounded-bl-md'"
          >
            <span class="block text-[11px] font-semibold opacity-70 mb-0.5">
              {{ m.role === 'user' ? 'You' : 'AI' }}
            </span>
            <p class="whitespace-pre-wrap break-words m-0">
              {{ m.content }}
              <span v-if="isLoading && m.id === messages[messages.length - 1]?.id"
                    class="ml-1 inline-block w-2 h-5 align-text-bottom bg-current animate-pulse"/>
            </p>
          </div>
        </div>
      </template>

      <div v-else class="h-full flex flex-col items-center justify-center text-gray-400">
        <p class="text-base">Ask me anything to get started!</p>
      </div>
    </div>

    <!-- Input -->
    <form class="flex items-center gap-2 p-3 border-t bg-white" @submit.prevent="sendMessage">
      <input
        v-model="userMessage"
        :disabled="isLoading"
        type="text"
        placeholder="Ask something..."
        class="flex-1 rounded-full border px-4 py-2 text-base outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        autocomplete="off"
      />
      <button
        :disabled="isLoading || !userMessage.trim()"
        type="submit"
        class="rounded-full bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ isLoading ? '...' : 'Send' }}
      </button>
    </form>
  </div>
</template>
