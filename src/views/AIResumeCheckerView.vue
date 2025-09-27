<!-- 修复后的简历检查器前端代码 - 文件上传问题修复版 -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { t, locale } = useI18n()

// 路由
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

// 消息和 Markdown 配置
interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  htmlContent?: string
  showUploadButton?: boolean
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

// 状态管理
const userMessage = ref<string>('')
const messages = ref<Message[]>([])
const isLoading = ref<boolean>(false)
const chatWindow = ref<HTMLDivElement | null>(null)
const copiedMessageId = ref<number | null>(null)

// Resume Checker 状态
type CheckerState = 'not-started' | 'ready-to-chat' | 'analyzing'
const checkerState = ref<CheckerState>('not-started')
const uploadedFileName = ref<string>('')
const isUploading = ref<boolean>(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 确认对话框和通知系统
const confirmDialog = ref()
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogConfirmText = ref('')
const dialogCancelText = ref('')

const showConfirmDialog = async (message: string, title: string = 'CitaCita'): Promise<boolean> => {
  if (confirmDialog.value) {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogConfirmText.value = t('languageChanged.clearHistory', 'Clear History')
    dialogCancelText.value = t('languageChanged.keepHistory', 'Keep History')
    return await confirmDialog.value.show()
  }
  return window.confirm("CitaCita: " + message)
}

const showMessage = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
  const notification = document.createElement('div')
  const bgColor = type === 'success' ? 'bg-green-500' : 
                  type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 transform transition-all duration-300 ${bgColor} shadow-lg`
  notification.textContent = message
  notification.style.transform = 'translateX(400px)'
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)'
  }, 10)
  
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

// 多语言文本
const getWelcomeText = () => {
  const texts = {
    'zh-CN': `欢迎使用CitaCita智能简历检查器！

CitaCita致力于为重返职场的女性提供全面的职业支持服务。

我们的AI简历检查器可以帮助您：
- 分析简历结构和内容完整性
- 提供针对性的改进建议
- 优化关键词以提高ATS系统通过率
- 根据不同行业标准调整简历格式
- 提升简历的整体专业度和吸引力

准备好提升您的简历了吗？请点击下方按钮上传您的简历文件开始分析。`,
    
    'en': `Welcome to CitaCita AI Resume Checker!

CitaCita is dedicated to providing comprehensive career support services for women returning to the workforce.

Our AI Resume Checker can help you:
- Analyze resume structure and content completeness
- Provide targeted improvement suggestions
- Optimize keywords to improve ATS system pass rate
- Adjust resume format according to different industry standards
- Enhance overall professionalism and attractiveness of your resume

Ready to enhance your resume? Please click the button below to upload your resume file to start the analysis.`,
    
    'ms': `Selamat datang ke Pemeriksa Resume AI CitaCita!

CitaCita berdedikasi untuk menyediakan perkhidmatan sokongan kerjaya menyeluruh untuk wanita yang kembali ke dunia pekerjaan.

Pemeriksa Resume AI kami boleh membantu anda:
- Menganalisis struktur resume dan kelengkapan kandungan
- Memberikan cadangan penambahbaikan yang tepat sasaran
- Mengoptimumkan kata kunci untuk meningkatkan kadar lulus sistem ATS
- Melaraskan format resume mengikut standard industri yang berbeza
- Meningkatkan profesionalisme dan daya tarikan keseluruhan resume anda

Bersedia untuk meningkatkan resume anda? Sila klik butang di bawah untuk muat naik fail resume anda untuk memulakan analisis.`
  }
  
  return texts[locale.value as keyof typeof texts] || texts['en']
}

const getAnalysisCompleteText = (fileName: string) => {
  const texts = {
    'zh-CN': `简历分析完成！

文件名：${fileName}

我已经完成了对您简历的初步分析。您可以询问我关于简历的任何问题，比如：
- 如何改进我的工作经历部分？
- 我的简历有什么优势？
- 如何让我的简历更吸引招聘者？
- 我应该添加哪些技能？`,
    
    'en': `Resume analysis complete!

File name: ${fileName}

I have completed the preliminary analysis of your resume. You can ask me any questions about your resume, such as:
- How can I improve my work experience section?
- What are the strengths of my resume?
- How can I make my resume more attractive to recruiters?
- What skills should I add?`,
    
    'ms': `Analisis resume selesai!

Nama fail: ${fileName}

Saya telah menyelesaikan analisis awal resume anda. Anda boleh bertanya kepada saya sebarang soalan tentang resume anda, seperti:
- Bagaimana saya boleh menambah baik bahagian pengalaman kerja saya?
- Apakah kelebihan resume saya?
- Bagaimana saya boleh menjadikan resume saya lebih menarik kepada perekrut?
- Kemahiran apa yang perlu saya tambah?`
  }
  
  return texts[locale.value as keyof typeof texts] || texts['en']
}

const getErrorText = () => {
  const texts = {
    'zh-CN': '抱歉，发生了错误，请重试。',
    'en': 'Sorry, an error occurred. Please try again.',
    'ms': 'Maaf, ralat berlaku. Sila cuba lagi.'
  }
  
  return texts[locale.value as keyof typeof texts] || texts['en']
}

const getUploadButtonText = () => {
  const texts = {
    'zh-CN': {
      uploading: '上传中...',
      upload: '上传简历'
    },
    'en': {
      uploading: 'Uploading...',
      upload: 'Upload Resume'
    },
    'ms': {
      uploading: 'Sedang memuat naik...',
      upload: 'Muat Naik Resume'
    }
  }
  
  const currentTexts = texts[locale.value as keyof typeof texts] || texts['en']
  return isUploading.value ? currentTexts.uploading : currentTexts.upload
}

// 文件上传处理 - 修复版本
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  console.log('文件选择事件触发', file) // 调试日志
  
  if (!file) {
    console.log('没有选择文件')
    return
  }
  
  console.log('选择的文件:', {
    name: file.name,
    type: file.type,
    size: file.size
  })
  
  // 检查文件类型
  const allowedTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    console.error('不支持的文件类型:', file.type)
    showMessage(getFileTypeErrorText(), 'error')
    return
  }
  
  // 检查文件大小 (10MB限制)
  if (file.size > 10 * 1024 * 1024) {
    showMessage('文件大小不能超过10MB', 'error')
    return
  }
  
  isUploading.value = true
  uploadedFileName.value = file.name
  
  try {
    console.log('开始上传文件...')
    
    // 创建FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', locale.value)
    
    console.log('发送请求到:', '/api/resume-analyze')
    console.log('语言参数:', locale.value)
    
    // 调用后端API
    const response = await fetch('/api/resume-analyze', {
      method: 'POST',
      body: formData
    })
    
    console.log('响应状态:', response.status)
    
    if (!response.ok) {
      throw new Error(`上传失败: HTTP ${response.status}`)
    }
    
    const result = await response.json()
    console.log('分析结果:', result)
    
    if (result.success) {
      // 显示分析结果
      const analysisText = getAnalysisCompleteText(file.name)
      
      // 添加分析结果到消息列表
      messages.value.push({
        id: Date.now(),
        role: 'assistant',
        content: analysisText,
        htmlContent: marked(analysisText) as string,
      })
      
      // 添加详细分析信息
      const detailsText = formatAnalysisDetails(result.analysis)
      messages.value.push({
        id: Date.now() + 1,
        role: 'assistant',
        content: detailsText,
        htmlContent: marked(detailsText) as string,
      })
      
      checkerState.value = 'ready-to-chat'
      showMessage('简历分析完成！', 'success')
      
    } else {
      throw new Error(result.message || '分析失败')
    }
    
  } catch (error) {
    console.error('简历分析失败:', error)
    showMessage(`分析失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
    
    // 重置状态
    checkerState.value = 'not-started'
    uploadedFileName.value = ''
    
  } finally {
    isUploading.value = false
    // 清除文件输入框的值，允许重新上传同一文件
    if (input) {
      input.value = ''
    }
  }
}

// 格式化分析详情
const formatAnalysisDetails = (analysis: any) => {
  const texts = {
    'zh-CN': `### 📊 详细分析结果

**质量评分:** ${analysis.qualityScore}/100

**简历结构分析:**
- 联系信息: ${analysis.structure.hasContactInfo ? '✅ 完整' : '❌ 缺失'}
- 个人简介: ${analysis.structure.hasSummary ? '✅ 包含' : '❌ 缺失'}  
- 工作经历: ${analysis.structure.hasExperience ? '✅ 包含' : '❌ 缺失'}
- 教育背景: ${analysis.structure.hasEducation ? '✅ 包含' : '❌ 缺失'}
- 技能展示: ${analysis.structure.hasSkills ? '✅ 包含' : '❌ 缺失'}
- 成就奖项: ${analysis.structure.hasAchievements ? '✅ 包含' : '❌ 缺失'}

**完整度:** ${Math.round(analysis.structure.completeness * 100)}%
**字数统计:** ${analysis.structure.wordCount} 字

**关键信息:**
- 邮箱地址: ${analysis.keyInfo.emails.length} 个
- 电话号码: ${analysis.keyInfo.phones.length} 个
- 技能关键词: ${analysis.keyInfo.skills.length} 个
- 工作经验: ${analysis.keyInfo.yearsOfExperience} 年
- 教育水平: ${analysis.keyInfo.educationLevel}

### 🎯 改进建议
${analysis.suggestions.map((s: any, i: number) => `${i + 1}. **${s.priority === 'high' ? '🔴 高优先级' : s.priority === 'medium' ? '🟡 中优先级' : '🟢 低优先级'}:** ${s.message}`).join('\n')}`,
    
    'en': `### 📊 Detailed Analysis Results

**Quality Score:** ${analysis.qualityScore}/100

**Resume Structure Analysis:**
- Contact Info: ${analysis.structure.hasContactInfo ? '✅ Complete' : '❌ Missing'}
- Summary: ${analysis.structure.hasSummary ? '✅ Included' : '❌ Missing'}  
- Experience: ${analysis.structure.hasExperience ? '✅ Included' : '❌ Missing'}
- Education: ${analysis.structure.hasEducation ? '✅ Included' : '❌ Missing'}
- Skills: ${analysis.structure.hasSkills ? '✅ Included' : '❌ Missing'}
- Achievements: ${analysis.structure.hasAchievements ? '✅ Included' : '❌ Missing'}

**Completeness:** ${Math.round(analysis.structure.completeness * 100)}%
**Word Count:** ${analysis.structure.wordCount} words

**Key Information:**
- Email addresses: ${analysis.keyInfo.emails.length}
- Phone numbers: ${analysis.keyInfo.phones.length}
- Skill keywords: ${analysis.keyInfo.skills.length}
- Years of experience: ${analysis.keyInfo.yearsOfExperience}
- Education level: ${analysis.keyInfo.educationLevel}

### 🎯 Improvement Suggestions
${analysis.suggestions.map((s: any, i: number) => `${i + 1}. **${s.priority === 'high' ? '🔴 High Priority' : s.priority === 'medium' ? '🟡 Medium Priority' : '🟢 Low Priority'}:** ${s.message}`).join('\n')}`,
    
    'ms': `### 📊 Keputusan Analisis Terperinci

**Skor Kualiti:** ${analysis.qualityScore}/100

**Analisis Struktur Resume:**
- Maklumat Hubungan: ${analysis.structure.hasContactInfo ? '✅ Lengkap' : '❌ Hilang'}
- Ringkasan: ${analysis.structure.hasSummary ? '✅ Disertakan' : '❌ Hilang'}  
- Pengalaman: ${analysis.structure.hasExperience ? '✅ Disertakan' : '❌ Hilang'}
- Pendidikan: ${analysis.structure.hasEducation ? '✅ Disertakan' : '❌ Hilang'}
- Kemahiran: ${analysis.structure.hasSkills ? '✅ Disertakan' : '❌ Hilang'}
- Pencapaian: ${analysis.structure.hasAchievements ? '✅ Disertakan' : '❌ Hilang'}

**Kelengkapan:** ${Math.round(analysis.structure.completeness * 100)}%
**Jumlah Perkataan:** ${analysis.structure.wordCount} perkataan

**Maklumat Utama:**
- Alamat email: ${analysis.keyInfo.emails.length}
- Nombor telefon: ${analysis.keyInfo.phones.length}
- Kata kunci kemahiran: ${analysis.keyInfo.skills.length}
- Tahun pengalaman: ${analysis.keyInfo.yearsOfExperience}
- Tahap pendidikan: ${analysis.keyInfo.educationLevel}

### 🎯 Cadangan Penambahbaikan
${analysis.suggestions.map((s: any, i: number) => `${i + 1}. **${s.priority === 'high' ? '🔴 Keutamaan Tinggi' : s.priority === 'medium' ? '🟡 Keutamaan Sederhana' : '🟢 Keutamaan Rendah'}:** ${s.message}`).join('\n')}`
  }
  
  return texts[locale.value as keyof typeof texts] || texts['en']
}

const getFileTypeErrorText = () => {
  const texts = {
    'zh-CN': '请上传PDF、Word文档或文本文件',
    'en': 'Please upload PDF, Word document or text file',
    'ms': 'Sila muat naik fail PDF, dokumen Word atau fail teks'
  }
  return texts[locale.value as keyof typeof texts] || texts['en']
}

// 修复的触发文件选择函数
const triggerFileSelect = () => {
  console.log('触发文件选择，当前状态:', {
    checkerState: checkerState.value,
    isUploading: isUploading.value,
    fileInputRef: fileInputRef.value
  })
  
  // 修复：处理fileInputRef可能是数组的情况
  let inputElement = null
  
  if (fileInputRef.value) {
    // 如果是数组，取第一个元素
    if (Array.isArray(fileInputRef.value) || fileInputRef.value.length !== undefined) {
      inputElement = fileInputRef.value[0]
      console.log('从数组中获取input元素:', inputElement)
    } else {
      inputElement = fileInputRef.value
      console.log('直接使用input元素:', inputElement)
    }
  }
  
  // 备用方案：直接通过DOM查询
  if (!inputElement || typeof inputElement.click !== 'function') {
    console.log('使用备用方案：通过DOM查询')
    inputElement = document.querySelector('#resume-file-input') || 
                   document.querySelector('input[type="file"][accept*=".pdf"]')
  }
  
  if (!inputElement) {
    console.error('fileInputRef 未找到，尝试所有方案都失败')
    return
  }
  
  // 触发文件选择
  try {
    if (typeof inputElement.click === 'function') {
      inputElement.click()
      console.log('文件选择对话框应该已经打开')
    } else {
      console.error('找到的元素没有click方法:', inputElement)
    }
  } catch (error) {
    console.error('触发文件选择失败:', error)
  }
}

// 发送消息功能
const sendMessage = async () => {
  const messageText = userMessage.value.trim()
  if (!messageText || isLoading.value || checkerState.value !== 'ready-to-chat') return
  
  // 添加用户消息
  messages.value.push({ 
    id: Date.now(), 
    role: 'user', 
    content: messageText 
  })
  userMessage.value = ''
  isLoading.value = true
  
  try {
    // 构建简历专用的聊天请求
    const systemMessages = {
      'zh-CN': `你是CitaCita的专业简历分析师。用户已经上传了简历文件"${uploadedFileName.value}"。请基于之前的分析结果回答用户关于简历改进的问题。请确保你的回答使用中文。`,
      'en': `You are a professional resume analyst from CitaCita. The user has uploaded a resume file "${uploadedFileName.value}". Please answer the user's questions about resume improvement based on the previous analysis results. Please ensure your answers are in English.`,
      'ms': `Anda adalah penganalisis resume profesional dari CitaCita. Pengguna telah memuat naik fail resume "${uploadedFileName.value}". Sila jawab soalan pengguna tentang penambahbaikan resume berdasarkan hasil analisis sebelumnya. Pastikan jawapan anda dalam Bahasa Melayu.`
    }
    
    // 构建完整的消息历史
    const fullMessages = [
      {
        role: 'system',
        content: systemMessages[locale.value as keyof typeof systemMessages] || systemMessages['en']
      },
      ...messages.value
        .filter(m => m.role !== 'assistant' || m.content.trim() !== '')
        .map(m => ({
          role: m.role,
          content: m.content
        }))
    ]
    
    const payload = {
      messages: fullMessages,
      model: 'gpt-oss-120b',
      stream: true,
      language: locale.value,
      ragConfig: {
        enabled: true,
        knowledgeBase: 'resume-guidance',
        retrievalContext: {
          resumeFile: uploadedFileName.value,
          userQuery: messageText,
          previousContext: messages.value.slice(-4)
        },
        retrievalFilters: ["resume-writing", "career-advice"]
      }
    }

    // 使用简历专用的API端点
    const response = await fetch('/api/resume-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Resume chat failed: ${response.status}`)
    }

    // 处理流式响应
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    const newMessage: Message = { 
      id: Date.now(), 
      role: 'assistant', 
      content: '' 
    }
    messages.value.push(newMessage)

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6))
            const content = data.choices?.[0]?.delta?.content
            if (content) {
              newMessage.content += content
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    newMessage.htmlContent = marked(newMessage.content) as string
    
  } catch (error) {
    console.error('Resume chat failed:', error)
    messages.value.push({
      id: Date.now(),
      role: 'assistant',
      content: getErrorText(),
      htmlContent: marked(getErrorText()) as string,
    })
  } finally {
    isLoading.value = false
  }
}

// 初始欢迎消息 - 修复版本
const displayWelcomeMessage = () => {
  const welcomeText = getWelcomeText()

  messages.value = [
    {
      id: Date.now(),
      role: 'assistant',
      content: welcomeText,
      htmlContent: marked(welcomeText) as string,
      showUploadButton: true,
    },
  ]
  
  // 调试信息
  console.log('欢迎消息已显示，状态:', {
    messagesCount: messages.value.length,
    checkerState: checkerState.value,
    showUploadButton: messages.value[0]?.showUploadButton
  })
}

// 重新开始功能
const handleRestart = () => {
  messages.value = []
  userMessage.value = ''
  uploadedFileName.value = ''
  checkerState.value = 'not-started'
  isLoading.value = false
  displayWelcomeMessage()
}

// 计算属性
const inputPlaceholder = computed(() => {
  const placeholders = {
    'zh-CN': {
      notStarted: '请先上传简历文件',
      loading: '正在分析...',
      ready: '询问关于您简历的任何问题...'
    },
    'en': {
      notStarted: 'Please upload your resume file first',
      loading: 'Analyzing...',
      ready: 'Ask any questions about your resume...'
    },
    'ms': {
      notStarted: 'Sila muat naik fail resume anda dahulu',
      loading: 'Menganalisis...',
      ready: 'Tanya sebarang soalan tentang resume anda...'
    }
  }
  
  const currentTexts = placeholders[locale.value as keyof typeof placeholders] || placeholders['en']
  
  if (checkerState.value === 'not-started') return currentTexts.notStarted
  if (isLoading.value) return currentTexts.loading
  return currentTexts.ready
})

// 监听语言变化
watch(locale, async (newLanguage, oldLanguage) => {
  if (newLanguage !== oldLanguage) {
    console.log(`Language changed from ${oldLanguage} to ${newLanguage}`)
    
    // 语言切换时重新显示欢迎消息
    if (tab.value === 'resume-checker' && checkerState.value === 'not-started') {
      displayWelcomeMessage()
      return
    }
    
    // 如果有聊天记录，使用自定义对话框询问用户
    if (messages.value.length > 0) {
      const shouldClearHistory = await showConfirmDialog(
        t('languageChanged.message', 'You have switched to a new language. Historical chat records are still in the original language. Do you want to clear the chat history?'),
        t('languageChanged.title', 'Language Changed')
      )
      
      if (shouldClearHistory) {
        messages.value = []
        userMessage.value = ''
        uploadedFileName.value = ''
        checkerState.value = 'not-started'
        displayWelcomeMessage()
        showMessage(t('languageChanged.historyCleared', 'Chat history cleared'), 'success')
      } else {
        showMessage(t('languageChanged.newMessagesOnly', 'New conversations will use the new language'), 'info')
      }
    }
  }
})

// 生命周期
onMounted(() => {
  console.log('组件已挂载, tab:', tab.value)
  if (tab.value === 'resume-checker') {
    displayWelcomeMessage()
  }
})

watch(tab, (newTab, oldTab) => {
  console.log('Tab 变化:', oldTab, '->', newTab)
  if (newTab === 'resume-checker' && newTab !== oldTab) {
    handleRestart()
  }
})

// 滚动和复制功能
const scrollToBottom = () => {
  nextTick(() => {
    chatWindow.value?.scrollTo({ 
      top: chatWindow.value.scrollHeight, 
      behavior: 'smooth' 
    })
  })
}

watch(messages, scrollToBottom, { deep: true })

const copyToClipboard = (text: string, messageId: number) => {
  navigator.clipboard.writeText(text).then(() => {
    copiedMessageId.value = messageId
    setTimeout(() => (copiedMessageId.value = null), 2000)
  })
}
</script>

<template>
  <div
    class="relative z-10 flex h-full w-full flex-col border-none bg-white/70 shadow-lg backdrop-blur-md py-4"
  >
    <!-- 新聊天按钮 -->
    <div class="absolute right-8 top-8 z-20">
      <Button
        v-if="checkerState !== 'not-started' || uploadedFileName"
        @click="handleRestart"
        class="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        :disabled="isUploading"
      >
        {{ t('AIPage.newChat') }}
      </Button>
    </div>

    <!-- 标签页 -->
    <div class="relative flex items-center px-4 py-3 text-gray-800">
      <div class="flex-1 flex justify-center">
        <Tabs v-model="tab" class="w-250">
          <TabsList class="grid w-full grid-cols-3 h-12">
            <TabsTrigger class="h-10 text-lg" value="resume-checker">
              {{ t('AIPage.checker') }}
            </TabsTrigger>
            <TabsTrigger class="h-10 text-lg" value="guide">
              {{ t('AIPage.guide') }}
            </TabsTrigger>
            <TabsTrigger class="h-10 text-lg" value="mock-interview">
              {{ t('AIPage.interview') }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>

    <!-- 聊天窗口 -->
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
            <!-- 复制按钮 -->
            <button
              v-if="m.role === 'assistant' && m.content"
              @click="copyToClipboard(m.content, m.id)"
              class="absolute top-1 right-1 p-1 rounded-md bg-gray-500/20 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-gray-500/40"
              aria-label="复制消息"
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

            <!-- 消息内容 -->
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

        <!-- 修复的上传按钮部分 -->
        <div
          v-if="m.showUploadButton && checkerState === 'not-started'"
          class="mt-4 flex w-full justify-center"
        >
          <!-- 隐藏的文件输入框 - 确保正确绑定 -->
          <input
            ref="fileInputRef"
            id="resume-file-input"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            @change="handleFileSelect"
            class="hidden"
            multiple="false"
          />
          
          <!-- 可见的上传按钮 - 修复点击事件 -->
          <button
            @click="triggerFileSelect" 
            :disabled="isUploading"
            class="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          >
            <svg 
              v-if="!isUploading"
              class="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <svg 
              v-else
              class="animate-spin w-5 h-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ getUploadButtonText() }}
          </button>
        </div>
      </div>

      <!-- 加载动画 -->
      <div v-if="isLoading" class="flex justify-start">
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

    <!-- 输入框 -->
    <form class="flex items-center gap-2 p-3 px-[18%]" @submit.prevent="sendMessage">
      <div
        class="relative flex w-full items-center rounded-full bg-gray-100/80 px-4 py-2 shadow-inner"
      >
        <input
          v-model="userMessage"
          :disabled="isLoading || isUploading || checkerState !== 'ready-to-chat'"
          type="text"
          :placeholder="inputPlaceholder"
          class="flex-1 border-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
          autocomplete="off"
          @keydown.enter.prevent="sendMessage"
        />
      </div>
      <button
        :disabled="
          isLoading ||
          !userMessage.trim() ||
          isUploading ||
          checkerState !== 'ready-to-chat'
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
  </div>
  
  <!-- 确认对话框组件 -->
  <ConfirmDialog
    ref="confirmDialog"
    :title="dialogTitle"
    :message="dialogMessage"
    :confirm-text="dialogConfirmText"
    :cancel-text="dialogCancelText"
  />
</template>

<style scoped>
/* 与原代码相同的样式 */
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