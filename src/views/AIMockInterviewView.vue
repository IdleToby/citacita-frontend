<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRoute, useRouter } from 'vue-router'
import RecordingModal from '@/components/RecordingModal.vue'
import toWav from 'audiobuffer-to-wav'
import { useI18n } from 'vue-i18n'
import MyToast from '@/components/MyToast.vue'

const { t, locale } = useI18n()

// --- 路由 ---
const router = useRouter()
const route = useRoute()
const getTabFromRoute = (path: string) => {
  if (path.includes('resume-checker')) return 'resume-checker'
  if (path.includes('guide')) return 'guide'
  if (path.includes('mock-interview')) return 'mock-interview'
  return ''
}
const tab = ref(getTabFromRoute(route.path))
watch(tab, (newTab) => {
  if (newTab === 'resume-checker') router.push('/ai/resume-checker')
  if (newTab === 'guide') router.push('/ai/guide')
  if (newTab === 'mock-interview') router.push('/ai/mock-interview')
})
watch(route, (newRoute) => {
  tab.value = getTabFromRoute(newRoute.path)
})

// --- 消息和 Markdown 配置 ---
interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  htmlContent?: string
  showStartButton?: boolean
  showJobInput?: boolean
}

// 新增：用于存储面试分析数据的接口
interface AnswerAnalysis {
  question: string
  answer: string
  // 假设API返回的对象包含流畅度、完整度等信息
  pronunciationResult: { type: 'text' } | Record<string, any>
}

marked.use({
  walkTokens(token) {
    if (token.type === 'code') {
      const language = hljs.getLanguage(token.lang) ? token.lang : 'plaintext'
      token.text = hljs.highlight(token.text, { language }).value
    }
  },
})
marked.setOptions({
  langPrefix: 'hljs language-',
  gfm: true,
  breaks: true,
} as any)

// --- 状态管理 ---
const userMessage = ref<string>('')
const messages = ref<Message[]>([])
const isLoading = ref<boolean>(false)
const chatWindow = ref<HTMLDivElement | null>(null)
const copiedMessageId = ref<number | null>(null)
// 新增：存储每次回答的分析结果
const userAnswersAnalysis = ref<AnswerAnalysis[]>([])

// --- 录音状态 (MediaRecorder + WAV) ---
const isRecording = ref(false)
const isTranscribing = ref(false)
const showRecordingModal = ref(false)
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioContext: AudioContext | null = null

// --- TTS 播放 ---
let currentAudioSource: AudioBufferSourceNode | null = null
const stopCurrentAudio = () => {
  if (currentAudioSource) {
    currentAudioSource.stop()
    currentAudioSource = null
  }
}
const playAudioStream = async (text: string) => {
  stopCurrentAudio()
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    const formData = new FormData()
    formData.append('text', text)
    const response = await fetch('/api/text-to-speech', { method: 'POST', body: formData })
    if (!response.ok) throw new Error(`TTS failed: ${response.status}`)
    const audioData = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(audioData)
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)
    source.start(0)
    currentAudioSource = source
    source.onended = () => {
      if (currentAudioSource === source) currentAudioSource = null
    }
  } catch (err) {
    console.error('TTS 播放失败:', err)
  }
}

// --- 面试流程 ---
type InterviewState = 'not-started' | 'in-progress' | 'finished'
const interviewState = ref<InterviewState>('not-started')
const currentQuestionIndex = ref(0)
const mockQuestions = ref([''])

// 生成最终面试评估的函数
const generateFinalEvaluation = async () => {
  isLoading.value = true
  const evaluationMessage: Message = {
    id: Date.now(),
    role: 'assistant',
    content: t('mock.evaluationGenerating'),
    htmlContent: marked(t('mock.evaluationGenerating')) as string,
  }
  messages.value.push(evaluationMessage)

  const hasVoiceInput = userAnswersAnalysis.value.some(
    (item) => item.pronunciationResult.type !== 'text',
  )

  // Format conversation history and analysis data
  const transcript = messages.value
    .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
    .join('\n')

  const analysisData = hasVoiceInput
    ? userAnswersAnalysis.value
        .map(
          (item, index) =>
            `Question ${index + 1}: "${item.question}"\nAnswer: "${
              item.answer
            }"\nPronunciation Analysis: ${JSON.stringify(item.pronunciationResult, null, 2)}`,
        )
        .join('\n\n')
    : ''

  // --- CHANGE: Use i18n and conditional logic for prompt ---
  const finalPrompt = `
${t('mock.finalReport.promptTitle')}
${t('mock.finalReport.jobRole')}: **${userText.value}**.
${t('mock.finalReport.language')}: **${
    locale.value === 'zh-CN' ? 'Chinese' : locale.value === 'ms' ? 'Bahasa Melayu' : 'English'
  }**.

${hasVoiceInput ? `Below is the full interview transcript and the pronunciation analysis data for each answer.` : `Below is the full interview transcript.`}

---
**${t('mock.finalReport.transcriptTitle')}:**
${transcript}
---
${
  hasVoiceInput
    ? `**${t('mock.finalReport.analysisTitle')}:**
${analysisData}
---`
    : ''
}

${hasVoiceInput ? t('mock.finalReport.instruction') : t('mock.finalReport.instructionNoVoice')}

### ${t('mock.finalReport.overall')}
${t('mock.overall')}

### ${t('mock.finalReport.strengths')}
- ${t('mock.finalReport.strength1')}
- ${t('mock.finalReport.strength2')}

### ${t('mock.finalReport.improvements')}
- ${t('mock.finalReport.improvement1')}
- ${hasVoiceInput ? t('mock.finalReport.improvement2') : t('mock.finalReport.improvement2_noVoice')}

### ${t('mock.finalReport.conclusion')}
${t('mock.finalReport.conclusionText')}
`

  const payload = {
    messages: [
      {
        role: 'user',
        content: finalPrompt,
      },
    ],
    model: 'gpt-oss-120b',
    stream: false,
  }

  try {
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const evaluationText = await response.text()
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: evaluationText,
      htmlContent: marked(evaluationText) as string,
    })
  } catch (error) {
    console.error('Failed to generate final evaluation:', error)
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: t('mock.evaluationError'),
      htmlContent: marked(t('mock.evaluationError')) as string,
    })
  } finally {
    isLoading.value = false
  }
}

const askNextQuestion = () => {
  if (currentQuestionIndex.value >= mockQuestions.value.length) {
    interviewState.value = 'finished'
    generateFinalEvaluation()
    return
  }
  const question = mockQuestions.value[currentQuestionIndex.value]
  isLoading.value = true
  setTimeout(() => {
    const newMessage: Message = { id: Date.now(), role: 'assistant', content: '' }
    messages.value.push(newMessage)
    let charIndex = 0
    const typingInterval = setInterval(() => {
      if (charIndex < question.length) {
        newMessage.content += question[charIndex]
        charIndex++
      } else {
        clearInterval(typingInterval)
        newMessage.htmlContent = marked(newMessage.content) as string
        isLoading.value = false
        currentQuestionIndex.value++
        playAudioStream(question)
      }
    }, 50)
  }, 1200)
}

const sendMessage = (
  pronunciationData: AnswerAnalysis['pronunciationResult'] = { type: 'text' },
) => {
  const messageText = userMessage.value.trim()
  if (!messageText || isLoading.value || interviewState.value !== 'in-progress') return
  stopCurrentAudio()

  messages.value.push({ id: Date.now(), role: 'user', content: messageText })

  // 存储问题、答案和分析数据
  const lastQuestion = mockQuestions.value[currentQuestionIndex.value - 1]
  userAnswersAnalysis.value.push({
    question: lastQuestion,
    answer: messageText,
    pronunciationResult: pronunciationData,
  })

  userMessage.value = ''
  askNextQuestion()
}

const userText = ref('')

const handleInterviewAction = async () => {
  if (!userText.value.trim()) return
  stopCurrentAudio()
  isLoading.value = true // 开始加载

  const payload = {
    messages: [
      {
        role: 'assistant',
        content:
          'You are an expert AI assistant specializing in generating professional job interview question scripts. Your primary function is to create a structured, realistic interview flow tailored to the given job role and language. You must strictly follow these rules: 1. Generate exactly 10 questions. 2. Output must be a valid JSON array of strings. 3. Do not include any introductory text, explanations, remarks, emojis, or markdown. 4. All questions must be in the language specified by the user prompt. 5. Questions must reflect a natural, professional interview progression.',
      },
      {
        role: 'user',
        content: `Please generate 10 professional interview questions in ${locale.value === 'zh-CN' ? 'Chinese' : locale.value === 'ms' ? 'Bahasa Melayu' : 'English'} for the role of '${userText.value}'. The questions should simulate a real, comprehensive interview and progress logically as follows: 1-2. General icebreaker and motivation questions. 3-6. Behavioral and situational questions focusing on past experiences and problem-solving. 7-8. Role-specific or technical questions assessing core competencies. 9. Career goals or future aspirations. 10. A closing question inviting the candidate to ask their own questions.`,
      },
    ]
      .filter((m) => !(m.role === 'assistant' && m.content === ''))
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
    model: 'gpt-oss-120b',
    stream: false,
    language: locale.value,
  }

  try {
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error('Failed to fetch questions')

    mockQuestions.value = await response.json()
    console.log('mockQuestions', mockQuestions.value)

    messages.value = []
    userMessage.value = ''
    currentQuestionIndex.value = 0
    interviewState.value = 'in-progress'
    askNextQuestion()
  } catch (error) {
    console.error('Error starting interview:', error)
    isLoading.value = false
    messages.value.push({
      id: Date.now(),
      role: 'assistant',
      content: t('mock.startError'),
      htmlContent: marked(t('mock.startError')) as string,
    })
  }
}

const displayWelcomeMessage = () => {
  messages.value = [
    {
      id: Date.now(),
      role: 'assistant',
      content: t('mock.welcome1'),
      htmlContent: marked(t('mock.welcome1')) as string,
      showStartButton: true,
      showJobInput: true,
    },
    {
      id: Date.now() + 1,
      role: 'assistant',
      content: t('mock.welcome2'),
      htmlContent: marked(t('mock.welcome2')) as string,
    },
  ]
}
onMounted(() => {
  if (tab.value === 'mock-interview') displayWelcomeMessage()
})
watch(tab, (newTab, oldTab) => {
  if (newTab === 'mock-interview' && newTab !== oldTab) {
    handleStartNewChat()
  }
})

watch(locale, () => {
  if (tab.value === 'mock-interview') handleStartNewChat()
})

// --- WAV 录音逻辑 ---
const startRecording = async () => {
  stopCurrentAudio()
  if (isRecording.value || isTranscribing.value) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    audioChunks = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      isRecording.value = false
      isTranscribing.value = true
      try {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        const arrayBuffer = await blob.arrayBuffer()
        if (!audioContext) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const wavBuffer = toWav(audioBuffer)
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
        const formData = new FormData()
        formData.append('audio', wavBlob, 'recording.wav')
        formData.append('language', locale.value)
        const response = await fetch('/api/pronunciation-evaluation', {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) throw new Error(`服务器错误: ${response.status}`)

        // The full JSON object returned from the API
        const fullResult = await response.json()

        // First, safely get the detailed results object.
        // The data is inside the first element of the "NBest" array.
        const bestResult = fullResult.NBest && fullResult.NBest[0]

        // If for some reason the detailed result doesn't exist, handle it gracefully.
        if (!bestResult) {
          console.error('Pronunciation analysis failed: NBest array is empty or missing.')
          // Use the transcribed text if available, otherwise show an error.
          userMessage.value = fullResult.DisplayText || t('mock.transcriptionFailed')
          if (userMessage.value.trim()) {
            sendMessage({ type: 'text' }) // Send as a plain text message
          }
          return // Exit the function
        }

        // Now, create the pronunciationData object using the CORRECT paths
        const pronunciationData = {
          DisplayText: fullResult.DisplayText, // This top-level property is correct
          FluencyScore: bestResult.FluencyScore, // Correct path
          CompletenessScore: bestResult.CompletenessScore, // Correct path
          PronScore: bestResult.PronScore, // Correct path
          type: 'voice', // (Recommended) Add this for clearer logic
        }

        // Clean up any properties that might be undefined (this is still good practice)
        Object.keys(pronunciationData).forEach((key) => {
          if (pronunciationData[key as keyof typeof pronunciationData] === undefined) {
            delete pronunciationData[key as keyof typeof pronunciationData]
          }
        })

        const transcribedText = fullResult.DisplayText || t('mock.transcriptionFailed')
        userMessage.value = transcribedText

        if (userMessage.value.trim()) {
          sendMessage(pronunciationData) // Pass the CORRECTLY populated object
        }
      } catch (err) {
        console.error('转录失败:', err)
        userMessage.value = `[${t('mock.transcriptionError', { error: err instanceof Error ? err.message : t('mock.transcriptionFailed') })}]`
      } finally {
        isTranscribing.value = false
        showRecordingModal.value = false
        stream.getTracks().forEach((t) => t.stop())
      }
    }
    isRecording.value = true
    showRecordingModal.value = true
    mediaRecorder.start()
  } catch (err) {
    console.error('麦克风访问错误:', err)
    alert(t('mock.micAccessDenied'))
    isRecording.value = false
    showRecordingModal.value = false
  }
}
const handleStopRequest = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
  }
}

const inputPlaceholder = computed(() => {
  if (interviewState.value === 'finished') return t('mock.inputPlaceholder.finished')
  if (interviewState.value === 'not-started') return t('mock.inputPlaceholder.notStarted')
  if (isLoading.value) return t('mock.inputPlaceholder.loading')
  return t('mock.inputPlaceholder.inProgress')
})
const scrollToBottom = () => {
  nextTick(() => {
    chatWindow.value?.scrollTo({ top: chatWindow.value.scrollHeight, behavior: 'smooth' })
  })
}
watch(messages, scrollToBottom, { deep: true })
onBeforeUnmount(() => {
  stopCurrentAudio()
  if (mediaRecorder && isRecording.value) mediaRecorder.stop()
})
const copyToClipboard = (text: string, messageId: number) => {
  navigator.clipboard.writeText(text).then(() => {
    copiedMessageId.value = messageId
    setTimeout(() => (copiedMessageId.value = null), 2000)
  })
}

const handleTextSubmit = () => {
  sendMessage({ type: 'text' })
}

const handleStartNewChat = () => {
  stopCurrentAudio()
  interviewState.value = 'not-started'
  userMessage.value = ''
  userText.value = ''
  messages.value = []
  userAnswersAnalysis.value = []
  mockQuestions.value = ['']
  currentQuestionIndex.value = 0
  isLoading.value = false
  displayWelcomeMessage()
}
</script>

<template>
  <div
    class="relative z-10 flex h-full w-full flex-col border-none bg-white/70 shadow-lg backdrop-blur-md py-4"
  >
    <MyToast :showToast="isLoading" :toastMessage="t('mock.loadingModalText')" />
    <div class="absolute right-8 top-8 z-20">
      <Button
        v-if="interviewState !== 'not-started'"
        @click="handleStartNewChat"
        class="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        :disabled="isRecording || isTranscribing"
      >
        {{ t('AIPage.newChat') }}
      </Button>
    </div>

    <div class="relative flex items-center px-4 py-3 text-gray-800">
      <div class="flex-1 flex justify-center">
        <Tabs v-model="tab" class="w-250">
          <TabsList class="grid w-full grid-cols-3 h-12">
            <TabsTrigger class="h-10 text-lg" value="resume-checker"
              >{{ t('AIPage.checker') }}
            </TabsTrigger>
            <TabsTrigger class="h-10 text-lg" value="guide">{{ t('AIPage.guide') }}</TabsTrigger>
            <TabsTrigger class="h-10 text-lg" value="mock-interview"
              >{{ t('AIPage.interview') }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>

    <div
      ref="chatWindow"
      class="chat-window flex-1 space-y-4 overflow-y-auto p-4 relative px-[20%]"
    >
      <div v-for="m in messages" :key="m.id">
        <div class="flex w-full" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
          <div
            class="message-bubble group relative max-w-[80%] rounded-xl px-3 py-2 shadow-sm"
            :class="
              m.role === 'user'
                ? 'bg-[#292D49C4]/70 text-white rounded-br-none'
                : 'bg-gray-200/70 text-gray-900 rounded-bl-none'
            "
          >
            <button
              v-if="m.role === 'assistant' && m.content"
              @click="copyToClipboard(m.content, m.id)"
              class="absolute top-1 right-1 p-1 rounded-md bg-gray-500/20 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-gray-500/40"
              :aria-label="t('mock.copyLabel')"
            >
              <svg
                v-if="copiedMessageId === m.id"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <div
              v-if="m.htmlContent"
              v-html="m.htmlContent"
              class="prose prose-sm max-w-none prose-p:my-0 prose-li:my-0 prose-pre:bg-gray-800/80 prose-pre:text-gray-200 prose-code:before:content-none prose-code:after:content-none"
            ></div>
            <p v-else class="m-0 whitespace-pre-wrap break-words">
              {{ m.content }}
            </p>
          </div>
        </div>

        <div
          v-if="m.showStartButton && interviewState === 'not-started'"
          class="mt-4 flex w-full flex-col items-start gap-3"
        >
          <div
            v-if="m.showJobInput"
            class="relative flex w-full max-w-sm items-center rounded-lg bg-gray-100/80 px-4 py-2 shadow-inner"
          >
            <input
              v-model="userText"
              type="text"
              :placeholder="t('mock.jobPlaceholder')"
              class="flex-1 border-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-500"
              autocomplete="off"
            />
          </div>

          <Button
            @click="handleInterviewAction"
            :disabled="!userText.trim() || isLoading"
            class="bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {{ t('mock.startInterview') }}
          </Button>
        </div>
      </div>

      <div
        v-if="isLoading && interviewState !== 'finished' && !messages.some((m) => m.content === '')"
        class="flex justify-start"
      >
        <div
          class="message-bubble group relative max-w-[80%] rounded-xl px-3 py-2 shadow-sm bg-gray-200/70 text-gray-900 rounded-bl-none"
        >
          <div class="flex items-center justify-center p-1">
            <svg
              class="loading-dots text-gray-700"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="12" r="2" fill="currentColor"></circle>
              <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
              <circle cx="18" cy="12" r="2" fill="currentColor"></circle>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <form class="flex items-center gap-2 p-3 px-[18%]" @submit.prevent="handleTextSubmit">
      <div
        class="relative flex w-full items-center rounded-full bg-gray-100/80 px-4 py-2 shadow-inner"
      >
        <input
          v-model="userMessage"
          :disabled="isLoading || isRecording || isTranscribing || interviewState !== 'in-progress'"
          type="text"
          :placeholder="inputPlaceholder"
          class="flex-1 border-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
          autocomplete="off"
          @keydown.enter.prevent="handleTextSubmit"
        />
        <button
          @click="startRecording"
          type="button"
          :disabled="isLoading || isTranscribing || isRecording || interviewState !== 'in-progress'"
          class="text-gray-600 hover:text-blue-600 focus:outline-none ml-2 cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400"
          :class="{ 'text-red-600 animate-pulse': isRecording }"
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
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      </div>
      <button
        :disabled="
          isLoading ||
          !userMessage.trim() ||
          isRecording ||
          isTranscribing ||
          interviewState !== 'in-progress'
        "
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
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 12h14" />
        </svg>
      </button>
    </form>

    <RecordingModal
      v-if="showRecordingModal"
      :is-transcribing="isTranscribing"
      @stop="handleStopRequest"
    />
  </div>
</template>

<style scoped>
/* 样式无需改动 */
.prose :first-child {
  margin-top: 0;
}

.prose :last-child {
  margin-bottom: 0;
}

.prose code::before,
.prose code::after {
  content: none !important;
}

.hljs {
  overflow-x: auto;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: rgb(31 41 55 / 0.8) !important;
}

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
