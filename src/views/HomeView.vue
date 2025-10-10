<!-- src/views/HomeView.vue -->
<template>
  <div
    ref="mainContainerRef"
    class="w-full h-full fixed inset-0 -z-0 overflow-hidden transition-all duration-1000 ease-in-out"
    :style="{
      backgroundColor: currentBgColor,
      backgroundImage: `url(${contentData[currentIndex].backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }"
  >
    <canvas ref="canvasRef" class="absolute top-0 left-0 w-full h-full"></canvas>

    <!-- 文本容器 -->
    <div class="absolute top-0 left-0 z-10 w-full h-full pointer-events-none">
      <div
        ref="textContainerRef"
        data-tour-step="4"
        class="absolute p-8 rounded-full bg-white/10 backdrop-blur-md pointer-events-auto shadow-xl border border-white/20 transition-transform duration-300 ease-out"
        style="will-change: transform; top: 0; left: 0; width: 300px; height: 300px; display: flex; align-items: center; justify-content: center;"
      >
        <transition name="fade" mode="out-in">
          <div :key="currentIndex" class="text-white text-center max-w-xs flex flex-col items-center justify-center gap-2">
            <p class="text-2xl md:text-2xl font-normal text-white text-center drop-shadow-2xl whitespace-pre-line leading-relaxed tracking-wide" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(255, 223, 100, 0.8), 0 0 30px rgba(255, 223, 100, 0.4), 0 0 45px rgba(255, 223, 100, 0.2); filter: drop-shadow(0 0 10px rgba(255, 223, 100, 0.6));">
              {{ t(`homePage.cards.${contentData[currentIndex].key}.description`) }}
            </p>
            <button
              data-tour-step="5"
              class="px-5 py-2.5 bg-white/40 text-xl font-bold backdrop-blur-sm text-white rounded-full hover:bg-white/55 transition-all duration-300 shadow-lg border border-white/50 hover:scale-105"
              @click="handleButtonClick"
              style="text-shadow: 1px 1px 3px rgba(0,0,0,0.5);"
            >
              {{ t(`homePage.cards.${contentData[currentIndex].key}.buttonText`) }}
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- 固定文字 -->
    <div class="absolute top-32 left-1/2 -translate-x-1/2 z-20 w-full px-4">
      <p class="text-white text-2xl md:text-5xl font-bold text-center drop-shadow-lg" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        {{ t('homePage.supportText') }}
      </p>
    </div>

    <!-- 页面指示器 -->
    <div data-tour-step="6" class="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
      <div class="flex space-x-3">
        <button
          v-for="(item, index) in contentData"
          :key="`indicator-${index}`"
          @click="goToPage(index)"
          class="relative transition-all duration-500 ease-out hover:scale-110"
          :class="{
            'w-5 h-5': index !== currentIndex,
            'w-6 h-6': index === currentIndex
          }"
        >
          <div
            class="absolute inset-0 rounded-full transition-all duration-700"
            :class="{
              'bg-white/20 animate-pulse': index !== currentIndex,
              'bg-yellow-300/40 animate-ping': index === currentIndex
            }"
          ></div>
          <div
            class="relative w-full h-full rounded-full transition-all duration-500 border"
            :class="{
              'bg-white/30 border-white/40': index !== currentIndex,
              'bg-yellow-200 border-yellow-100 shadow-lg shadow-yellow-200/50': index === currentIndex
            }"
          >
            <div
              v-if="index === currentIndex"
              class="absolute inset-0 rounded-full bg-yellow-100 animate-pulse opacity-60"
            ></div>
          </div>
        </button>
      </div>
    </div>

    <!-- 切换按钮 -->
    <button
      @click="prev"
      data-tour-step="3"
      class="absolute left-5 md:left-10 top-1/2 -translate-y-1/2 z-20 group"
    >
      <div class="absolute inset-0 rounded-full bg-yellow-300/40 animate-ping"></div>
      <div class="absolute inset-0 rounded-full bg-yellow-300/20 animate-pulse"></div>
      <div class="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-yellow-400/90 hover:bg-yellow-300 text-gray-800 text-3xl md:text-4xl font-bold rounded-full shadow-xl transition-all duration-300 group-hover:scale-110 border-2 border-yellow-200">
        <div class="absolute inset-1 rounded-full bg-yellow-100 animate-pulse opacity-40"></div>
        <span class="relative z-10">❮</span>
      </div>
    </button>

    <button
      @click="next"
      data-tour-step="3"
      class="absolute right-5 md:right-10 top-1/2 -translate-y-1/2 z-20 group"
    >
      <div class="absolute inset-0 rounded-full bg-yellow-300/40 animate-ping"></div>
      <div class="absolute inset-0 rounded-full bg-yellow-300/20 animate-pulse"></div>
      <div class="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-yellow-400/90 hover:bg-yellow-300 text-gray-800 text-3xl md:text-4xl font-bold rounded-full shadow-xl transition-all duration-300 group-hover:scale-110 border-2 border-yellow-200">
        <div class="absolute inset-1 rounded-full bg-yellow-100 animate-pulse opacity-40"></div>
        <span class="relative z-10">❯</span>
      </div>
    </button>

    <!-- 导览按钮 - 左下角 -->
    <div data-tour-step="8" class="fixed bottom-1 left-1 z-30">
      <img
        :src="tourButtonImage"
        alt="Take a Tour"
        class="cursor-pointer transition-transform duration-300 ease-out hover:scale-110"
        style="width: 200px; height: 200px; object-fit: contain;"
        :class="{ 'animate-bounce': !hasSeenTour }"
        @click="startTour()"
      />
    </div>

    <!-- Citabot Icon - 右下角 -->
    <div data-tour-step="7" class="fixed bottom-1 right-1 z-30">
      <img
        :src="citabotImage"
        alt="Citabot"
        class="cursor-pointer transition-transform duration-300 ease-out hover:scale-110"
        style="width: 200px; height: 200px; object-fit: contain;"
        @click="router.push('/ai')"
      />
    </div>

    <div class="hidden">
      <img
        v-for="(item, index) in contentData"
        :key="`preload-${index}`"
        :src="item.backgroundImage"
        @load="onImageLoad(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Driver } from 'driver.js'
import {
  Scene, PerspectiveCamera, WebGLRenderer, Mesh, MeshStandardMaterial,
  MeshBasicMaterial, SphereGeometry, Object3D, Vector3, DirectionalLight,
  AmbientLight, TorusGeometry, TextureLoader
} from 'three'
import { gsap } from 'gsap'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t, locale } = useI18n()

type PopoverPosition = 'top' | 'right' | 'bottom' | 'left' | 'top-center' | 'top-left' | 'top-right' | 'right-center' | 'right-top' | 'right-bottom' | 'bottom-center' | 'bottom-left' | 'bottom-right' | 'left-center' | 'left-top' | 'left-bottom' | 'mid-center'

interface TourStep {
  element: string
  popover: {
    title: string
    description: string
    position: PopoverPosition
  }
}

const citabotImage = computed(() => {
  switch (locale.value) {
    case 'ms': return '/images/citabot-ms.png'
    case 'zh-CN': return '/images/citabot-zh.png'
    default: return '/images/citabot.png'
  }
})

const tourButtonImage = computed(() => {
  switch (locale.value) {
    case 'ms': return '/images/citacita-ms.png'
    case 'zh-CN': return '/images/citatour-zh.png'
    default: return '/images/citatour.png'
  }
})

const BUBBLE_DISTANCE = 1.4
const BUBBLE_HEIGHT = 0.1
const PROJ_X_SCALE = 0.6
const PROJ_Y_SCALE = 0.6
const MOON_SIZE = 1.3

interface ContentItem {
  key: string
  targetRotationY: number
  color: string
  path: string
  backgroundImage: string
}

const mainContainerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const textContainerRef = ref<HTMLDivElement | null>(null)
const hasSeenTour = ref(false)

const contentData = ref<ContentItem[]>([
  { key: 'jobs2', targetRotationY: 0, color: '#312e81', path: '/jobs', backgroundImage: '/images/homepage-jobs-for-me.png' },
  { key: 'map', targetRotationY: Math.PI / 3, color: '#1e293b', path: '/map', backgroundImage: '/images/map.png' },
  { key: 'jobs1', targetRotationY: (2 * Math.PI) / 3, color: '#dc2626', path: '/jobs', backgroundImage: '/images/jobs-for-me.png' },
  { key: 'aiTools', targetRotationY: Math.PI, color: '#064e3b', path: '/ai', backgroundImage: '/images/ai-tools.png' },
  { key: 'grants', targetRotationY: (4 * Math.PI) / 3, color: '#7c3aed', path: '/grants', backgroundImage: '/images/grants.png' },
  { key: 'faq', targetRotationY: (5 * Math.PI) / 3, color: '#059669', path: '/faq', backgroundImage: '/images/faq.png' },
])

const currentIndex = ref(0)
const currentBgColor = ref(contentData.value[0].color)
const loadedImages = ref<Set<number>>(new Set())

let scene: Scene
let camera: PerspectiveCamera
let renderer: WebGLRenderer
let mainShape: Mesh
let textAnchor: Object3D
let satellitePivot: Object3D
let animationFrameId: number
let isAnimating = false
let driverInstance: Driver | null = null
const anchorPositionVector = new Vector3()

const onImageLoad = (index: number) => {
  loadedImages.value.add(index)
}

const switchLanguage = (lang: string) => {
  locale.value = lang
  if (driverInstance && driverInstance.isActive?.()) {
    const currentStep = driverInstance.getActiveIndex?.()
    if (typeof currentStep === 'number') {
      driverInstance.destroy()
      driverInstance = null
      setTimeout(() => {
        startTour(currentStep)
      }, 100)
    }
  }
}

const createLanguageSwitcher = () => {
  const languages = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'ms', label: 'MS', flag: '🇲🇾' }
  ]

  return `
    <div class="driver-language-switcher" style="display: flex; gap: 8px; margin-top: 12px; justify-content: center;">
      ${languages.map(lang => `
        <button
          onclick="window.__switchTourLanguage('${lang.code}')"
          class="driver-lang-btn ${locale.value === lang.code ? 'active' : ''}"
          style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid ${locale.value === lang.code ? '#fbbf24' : '#e5e7eb'};
            background: ${locale.value === lang.code ? '#fef3c7' : 'white'};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: all 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          "
          onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#fbbf24';"
          onmouseout="this.style.transform='scale(1)'; this.style.borderColor='${locale.value === lang.code ? '#fbbf24' : '#e5e7eb'}';"
          title="${lang.label}"
        >
          ${lang.flag}
        </button>
      `).join('')}
    </div>
  `
}

const startTour = (startStep?: number) => {
  (window as any).__switchTourLanguage = switchLanguage

  if (!driverInstance) {
    const steps: TourStep[] = [
      {
        element: '[data-tour-step="1"]',
        popover: {
          title: t('tour.step1.title') || 'Navigation Menu',
          description: (t('tour.step1.description') || 'Access five main pages.') + createLanguageSwitcher(),
          position: 'bottom'
        }
      },
      {
        element: '[data-tour-step="2"]',
        popover: {
          title: t('tour.step2.title') || 'Language Switcher',
          description: (t('tour.step2.description') || 'Switch between languages.') + createLanguageSwitcher(),
          position: 'bottom'
        }
      },
      {
        element: '[data-tour-step="3"]',
        popover: {
          title: t('tour.step3.title') || 'Scene Navigation',
          description: (t('tour.step3.description') || 'Click or scroll to switch scenes.') + createLanguageSwitcher(),
          position: 'right'
        }
      },
      {
        element: '[data-tour-step="4"]',
        popover: {
          title: t('tour.step4.title') || 'Scene Information',
          description: (t('tour.step4.description') || 'View scene details here.') + createLanguageSwitcher(),
          position: 'right'
        }
      },
      {
        element: '[data-tour-step="5"]',
        popover: {
          title: t('tour.step5.title') || 'Action Button',
          description: (t('tour.step5.description') || 'Navigate to feature page.') + createLanguageSwitcher(),
          position: 'top'
        }
      },
      {
        element: '[data-tour-step="6"]',
        popover: {
          title: t('tour.step6.title') || 'Scene Indicators',
          description: (t('tour.step6.description') || 'Jump to any scene directly.') + createLanguageSwitcher(),
          position: 'top'
        }
      },
      {
        element: '[data-tour-step="7"]',
        popover: {
          title: t('tour.step7.title') || 'Citabot Assistant',
          description: (t('tour.step7.description') || 'Chat with AI assistant.') + createLanguageSwitcher(),
          position: 'left'
        }
      },
      {
        element: '[data-tour-step="8"]',
        popover: {
          title: t('tour.step8.title') || 'Tour Button',
          description: (t('tour.step8.description') || 'Click this button anytime to restart the tour.') + createLanguageSwitcher(),
          position: 'right'
        }
      }
    ]

    driverInstance = driver({
      showProgress: true,
      steps: steps,
      onDestroyed: () => {
        hasSeenTour.value = true
        localStorage.setItem('homepage_tour_seen', 'true')
        delete (window as any).__switchTourLanguage
      }
    })
  }

  driverInstance.drive(startStep ?? 0)
}

const updateTextPosition = () => {
  if (!textContainerRef.value || !mainContainerRef.value) return
  textAnchor.getWorldPosition(anchorPositionVector)
  anchorPositionVector.project(camera)

  const { clientWidth: width, clientHeight: height } = mainContainerRef.value
  const { offsetWidth: boxWidth, offsetHeight: boxHeight } = textContainerRef.value

  const x = (anchorPositionVector.x * PROJ_X_SCALE + 0.5) * width
  const y = (-anchorPositionVector.y * PROJ_Y_SCALE + 0.5) * height

  const NAV_HEIGHT = 80
  const NAV_MARGIN = 20
  const SAFE_TOP = NAV_HEIGHT + NAV_MARGIN
  const SAFE_BOTTOM = 160

  const cardTop = y - boxHeight / 2
  const cardBottom = y + boxHeight / 2

  let finalX = x
  let finalY = y

  if (cardTop < SAFE_TOP) {
    const overlap = SAFE_TOP - cardTop
    if (overlap < boxHeight * 0.6) {
      finalY = SAFE_TOP + boxHeight / 2
    } else {
      if (x < width / 2) {
        finalX = Math.min(x + overlap * 0.8, width - boxWidth / 2 - 20)
        finalY = Math.max(y + overlap * 0.5, SAFE_TOP + boxHeight / 2)
      } else {
        finalX = Math.max(x - overlap * 0.8, boxWidth / 2 + 20)
        finalY = Math.max(y + overlap * 0.5, SAFE_TOP + boxHeight / 2)
      }
    }
  }

  if (cardBottom > height - SAFE_BOTTOM) {
    const bottomOverlap = cardBottom - (height - SAFE_BOTTOM)
    finalY = height - SAFE_BOTTOM - boxHeight / 2

    if (finalY - boxHeight / 2 < SAFE_TOP) {
      finalY = Math.max(SAFE_TOP + boxHeight / 2, height / 2)
      if (x < width / 2) {
        finalX = Math.min(x + bottomOverlap, width - boxWidth / 2 - 20)
      } else {
        finalX = Math.max(x - bottomOverlap, boxWidth / 2 + 20)
      }
    }
  }

  const clampedX = Math.max(boxWidth / 2 + 10, Math.min(finalX, width - boxWidth / 2 - 10))
  const clampedY = Math.max(boxHeight / 2 + 10, Math.min(finalY, height - boxHeight / 2 - 10))

  textContainerRef.value.style.transform =
    `translate(-50%, -50%) translate(${clampedX}px, ${clampedY}px)`
}

onMounted(() => {
  const tourSeen = localStorage.getItem('homepage_tour_seen')
  hasSeenTour.value = tourSeen === 'true'

  if (!canvasRef.value || !mainContainerRef.value) return
  const { clientWidth, clientHeight } = mainContainerRef.value

  scene = new Scene()
  camera = new PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000)
  camera.position.set(0, 0.4, 3.5)
  renderer = new WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  renderer.setSize(clientWidth, clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const textureLoader = new TextureLoader()
  const geometry = new SphereGeometry(MOON_SIZE, 64, 64)
  const material = new MeshStandardMaterial({
    metalness: 0.0,
    roughness: 0.95,
    transparent: true,
    opacity: 0.6
  })
  mainShape = new Mesh(geometry, material)

  const possiblePaths = ['/images/moon.png', 'images/moon.png', './images/moon.png', '/public/images/moon.png']
  const tryLoadTexture = (pathIndex = 0) => {
    if (pathIndex >= possiblePaths.length) {
      console.error('❌ 无法加载月亮纹理')
      return
    }
    textureLoader.load(
      possiblePaths[pathIndex],
      (texture) => {
        material.map = texture
        material.color.setHex(0xffffff)
        material.needsUpdate = true
        renderer.render(scene, camera)
      },
      undefined,
      () => tryLoadTexture(pathIndex + 1)
    )
  }
  tryLoadTexture()
  scene.add(mainShape)

  mainShape.rotation.x = 0.3
  mainShape.rotation.z = 0.1

  const orbitPathRadius = 1.6
  const orbitGroup = new Object3D()
  orbitGroup.rotation.z = Math.PI / 16
  orbitGroup.rotation.x = Math.PI / 32
  mainShape.add(orbitGroup)

  const orbitGeometry = new TorusGeometry(orbitPathRadius, 0.003, 8, 100)
  const orbitMaterial = new MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.3 })
  const orbit = new Mesh(orbitGeometry, orbitMaterial)
  orbit.rotation.x = Math.PI / 2
  orbitGroup.add(orbit)

  satellitePivot = new Object3D()
  orbitGroup.add(satellitePivot)

  const orbiterGeometry = new SphereGeometry(0.04, 16, 16)
  const orbiterMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  const orbiter = new Mesh(orbiterGeometry, orbiterMaterial)
  orbiter.position.x = orbitPathRadius
  satellitePivot.add(orbiter)

  textAnchor = new Object3D()
  textAnchor.position.set(BUBBLE_DISTANCE, BUBBLE_HEIGHT, 0)
  mainShape.add(textAnchor)

  const light = new DirectionalLight(0xffffff, 1.0)
  light.position.set(0, 0, 5)
  scene.add(light)

  const ambientLight = new AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  mainShape.rotation.y = contentData.value[currentIndex.value].targetRotationY
  mainShape.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  updateTextPosition()

  const animate = () => {
    satellitePivot.rotation.y += 0.002
    mainShape.rotation.y += 0.001
    renderer.render(scene, camera)
    animationFrameId = requestAnimationFrame(animate)
  }
  animate()

  window.addEventListener('wheel', handleMouseWheel)
  window.addEventListener('resize', handleResize)

  if (!hasSeenTour.value) {
    setTimeout(() => {
      startTour()
    }, 1000)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('wheel', handleMouseWheel)
  window.removeEventListener('resize', handleResize)
  renderer.dispose()
  scene.clear()
  if (driverInstance) {
    driverInstance.destroy()
  }
  delete (window as any).__switchTourLanguage
})

const goToPage = (index: number) => {
  if (index === currentIndex.value || isAnimating) return
  currentIndex.value = index
}

const handleMouseWheel = (event: WheelEvent) => {
  if (isAnimating) return
  if (event.deltaY > 0) next()
  else prev()
}

const next = () => {
  if (isAnimating) return
  currentIndex.value = (currentIndex.value + 1) % contentData.value.length
}

const prev = () => {
  if (isAnimating) return
  currentIndex.value = (currentIndex.value - 1 + contentData.value.length) % contentData.value.length
}

watch(currentIndex, (newIndex) => {
  isAnimating = true
  const targetItem = contentData.value[newIndex]
  const targetRotationY = targetItem.targetRotationY
  const currentRotation = mainShape.rotation.y

  let diff = targetRotationY - currentRotation
  if (Math.abs(diff) > Math.PI) diff -= Math.sign(diff) * 2 * Math.PI

  const tl = gsap.timeline({ onComplete: () => { isAnimating = false } })

  tl.to(currentBgColor, {
      value: targetItem.color,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        currentBgColor.value = (gsap.getProperty(currentBgColor, 'value') as string) || targetItem.color
      },
    }, 0)
    .to(mainShape.rotation, {
      y: currentRotation + diff,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: updateTextPosition,
    }, 0)
})

const handleResize = () => {
  if (!mainContainerRef.value || !renderer) return
  const { clientWidth, clientHeight } = mainContainerRef.value
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  updateTextPosition()
}

const handleButtonClick = () => {
  const targetPath = contentData.value[currentIndex.value].path
  router.push(targetPath)
}
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

:deep(.driver-popover) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

:deep(.driver-popover-title) {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
}

:deep(.driver-popover-description) {
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.6;
}

:deep(.driver-popover-next-btn) {
  background: #fbbf24 !important;
  color: #1f2937 !important;
  border-radius: 9999px;
  font-weight: bold;
  padding: 0.5rem 1.5rem;
}

:deep(.driver-popover-next-btn):hover {
  background: #f59e0b !important;
}

:deep(.driver-overlay) {
  background-color: rgba(0, 0, 0, 0.75) !important;
}

:deep(.driver-active-element) {
  outline: 3px solid #fbbf24 !important;
  outline-offset: 4px;
}

:deep(.driver-language-switcher) {
  pointer-events: auto !important;
}

:deep(.driver-lang-btn) {
  pointer-events: auto !important;
}
</style>
