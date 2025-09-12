<!-- src/views/HomeView.vue -->
<!-- 转动3D月亮,6个角度切换6个不同背景以及对应提示词,learn more按钮跳转对应页面 -->
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
        class="absolute p-8 rounded-full bg-white/10 backdrop-blur-md pointer-events-auto shadow-xl border border-white/20 transition-transform duration-300 ease-out"
        style="will-change: transform; top: 0; left: 0; width: 300px; height: 300px; display: flex; align-items: center; justify-content: center;"
      >
        <transition name="fade" mode="out-in">
          <div :key="currentIndex" class="text-white text-center max-w-xs flex flex-col items-center justify-center gap-2">
            <!-- 框内文本显示 -->
            <p class="text-2xl md:text-2xl font-normal text-white text-center drop-shadow-2xl whitespace-pre-line leading-relaxed tracking-wide" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(255, 223, 100, 0.8), 0 0 30px rgba(255, 223, 100, 0.4), 0 0 45px rgba(255, 223, 100, 0.2); filter: drop-shadow(0 0 10px rgba(255, 223, 100, 0.6));">
              {{ t(`homePage.cards.${contentData[currentIndex].key}.description`) }}
            </p>
            <!-- 按钮移到圆形框内 -->
            <button
              class="px-4 py-2 bg-white/30 text-xl font-semibold backdrop-blur-sm text-white rounded-full hover:bg-white/50 transition-colors shadow-md border border-white/30"
              @click="handleButtonClick"
            >
              {{ t(`homePage.cards.${contentData[currentIndex].key}.buttonText`) }}
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- 页面指示器（萤火虫效果） -->
    <div class="absolute bottom-30 left-1/2 -translate-x-1/2 z-20">
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
          <!-- 外圈光晕效果 -->
          <div
            class="absolute inset-0 rounded-full transition-all duration-700"
            :class="{
              'bg-white/20 animate-pulse': index !== currentIndex,
              'bg-yellow-300/40 animate-ping': index === currentIndex
            }"
          ></div>

          <!-- 内圈萤火虫 -->
          <div
            class="relative w-full h-full rounded-full transition-all duration-500 border"
            :class="{
              'bg-white/30 border-white/40': index !== currentIndex,
              'bg-yellow-200 border-yellow-100 shadow-lg shadow-yellow-200/50': index === currentIndex
            }"
          >
            <!-- 萤火虫闪烁效果 -->
            <div
              v-if="index === currentIndex"
              class="absolute inset-0 rounded-full bg-yellow-100 animate-pulse opacity-60"
            ></div>
          </div>
        </button>
      </div>
    </div>

    <!-- 固定文字 Citacita is here to support you!-->
    <div class="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 w-full">
      <p class="text-white text-2xl md:text-5xl font-bold text-center drop-shadow-lg" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        {{ t('homePage.supportText') }}
      </p>
    </div>



    <!-- 切换按钮 -->
    <button
      @click="prev"
      class="absolute left-5 md:left-10 top-1/2 -translate-y-1/2 z-20 text-white text-4xl p-2 rounded-full hover:bg-white/10 transition-colors"
    >
      ❮
    </button>
    <button
      @click="next"
      class="absolute right-5 md:right-10 top-1/2 -translate-y-1/2 z-20 text-white text-4xl p-2 rounded-full hover:bg-white/10 transition-colors"
    >
      ❯
    </button>

    <!-- 隐藏的图片预加载 -->
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
import { onMounted, onUnmounted, ref, type Ref, watch } from 'vue'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  SphereGeometry,
  Object3D,
  Vector3,
  DirectionalLight,
  AmbientLight,
  TorusGeometry,
  TextureLoader
} from 'three'
import { gsap } from 'gsap'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
const router = useRouter()

const { t } = useI18n()

/** ============== 可调参数（调整月亮大小和文字圆位置） ============== */
const BUBBLE_DISTANCE = 1.4   // 距离月亮中心，更靠近月亮
const BUBBLE_HEIGHT   = 0.1   // 垂直偏移，稍微降低
const PROJ_X_SCALE    = 0.6   // 屏幕投影X缩放，稍微增大以补偿月亮缩小
const PROJ_Y_SCALE    = 0.6   // 屏幕投影Y缩放，稍微增大以补偿月亮缩小
const MOON_SIZE       = 1.3   // 月亮半径，从1.0调大到1.3

interface ContentItem {
  key: string
  targetRotationY: number
  color: string
  path: string
  backgroundImage: string
}

const mainContainerRef: Ref<HTMLDivElement | null> = ref(null)
const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)
const textContainerRef: Ref<HTMLDivElement | null> = ref(null)

const contentData = ref<ContentItem[]>([
  {
    key: 'jobs1',
    targetRotationY: 0,
    color: '#312e81',
    path: '/jobs',
    backgroundImage: '/images/homepage-jobs-for-me.png',
  },
  {
    key: 'map',
    targetRotationY: Math.PI / 3,
    color: '#1e293b',
    path: '/map',
    backgroundImage: '/images/map.png',
  },
  {
    key: 'jobs2',
    targetRotationY: (2 * Math.PI) / 3,
    color: '#dc2626',
    path: '/jobs',
    backgroundImage: '/images/jobs-for-me.png',
  },
  {
    key: 'aiTools',
    targetRotationY: Math.PI,
    color: '#064e3b',
    path: '/ai',
    backgroundImage: '/images/ai-tools.png',
  },
  {
    key: 'grants',
    targetRotationY: (4 * Math.PI) / 3,
    color: '#7c3aed',
    path: '/grants',
    backgroundImage: '/images/grants.png',
  },
  {
    key: 'faq',
    targetRotationY: (5 * Math.PI) / 3,
    color: '#059669',
    path: '/faq',
    backgroundImage: '/images/faq.png',
  },
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
const anchorPositionVector = new Vector3()

/** 图片预加载回调 */
const onImageLoad = (index: number) => {
  loadedImages.value.add(index)
}

/** 计算并更新文字圆的位置（智能避让导航栏和底部UI） */
const updateTextPosition = () => {
  if (!textContainerRef.value || !mainContainerRef.value) return
  textAnchor.getWorldPosition(anchorPositionVector)
  anchorPositionVector.project(camera)

  const { clientWidth: width, clientHeight: height } = mainContainerRef.value
  const { offsetWidth: boxWidth, offsetHeight: boxHeight } = textContainerRef.value

  const x = (anchorPositionVector.x * PROJ_X_SCALE + 0.5) * width
  const y = (-anchorPositionVector.y * PROJ_Y_SCALE + 0.5) * height

  // 避让区域设置
  const NAV_HEIGHT = 80
  const NAV_MARGIN = 20
  const SAFE_TOP = NAV_HEIGHT + NAV_MARGIN

  // 底部UI避让 - 萤火虫指示器现在在 bottom-40 (160px)，按钮在 bottom-10 (40px)
  const SAFE_BOTTOM = 200  // 从底部算起的安全区域

  const cardTop = y - boxHeight / 2
  const cardBottom = y + boxHeight / 2

  let finalX = x
  let finalY = y

  // 避让顶部导航栏
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

  // 避让底部UI元素
  if (cardBottom > height - SAFE_BOTTOM) {
    const bottomOverlap = cardBottom - (height - SAFE_BOTTOM)
    finalY = height - SAFE_BOTTOM - boxHeight / 2

    // 如果向上推移后与顶部冲突，则向侧边推移
    if (finalY - boxHeight / 2 < SAFE_TOP) {
      finalY = Math.max(SAFE_TOP + boxHeight / 2, height / 2)
      if (x < width / 2) {
        finalX = Math.min(x + bottomOverlap, width - boxWidth / 2 - 20)
      } else {
        finalX = Math.max(x - bottomOverlap, boxWidth / 2 + 20)
      }
    }
  }

  // 确保最终位置在屏幕范围内
  const clampedX = Math.max(boxWidth / 2 + 10, Math.min(finalX, width - boxWidth / 2 - 10))
  const clampedY = Math.max(boxHeight / 2 + 10, Math.min(finalY, height - boxHeight / 2 - 10))

  textContainerRef.value.style.transform =
    `translate(-50%, -50%) translate(${clampedX}px, ${clampedY}px)`
}

onMounted(() => {
  if (!canvasRef.value || !mainContainerRef.value) return
  const { clientWidth, clientHeight } = mainContainerRef.value

  scene = new Scene()
  camera = new PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000)
  camera.position.set(0, -0.2, 3.5)
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

  const possiblePaths = [
    '/images/moon.png',
    'images/moon.png',
    './images/moon.png',
    '/public/images/moon.png'
  ]

  const tryLoadTexture = (pathIndex = 0) => {
    if (pathIndex >= possiblePaths.length) {
      console.error('❌ 无法加载月亮纹理')
      return
    }
    const currentPath = possiblePaths[pathIndex]
    textureLoader.load(
      currentPath,
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

  const orbitPathRadius = 1.6  // 缩小轨道半径，从2.0改为1.6
  const orbitGroup = new Object3D()
  orbitGroup.rotation.z = Math.PI / 16
  orbitGroup.rotation.x = Math.PI / 32
  mainShape.add(orbitGroup)

  const orbitGeometry = new TorusGeometry(orbitPathRadius, 0.003, 8, 100)  // 缩小轨道线粗细
  const orbitMaterial = new MeshBasicMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.3,  // 降低透明度，让轨道更微妙
  })
  const orbit = new Mesh(orbitGeometry, orbitMaterial)
  orbit.rotation.x = Math.PI / 2
  orbitGroup.add(orbit)

  satellitePivot = new Object3D()
  orbitGroup.add(satellitePivot)

  const orbiterGeometry = new SphereGeometry(0.04, 16, 16)  // 缩小卫星大小
  const orbiterMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7  // 降低卫星透明度
  })
  const orbiter = new Mesh(orbiterGeometry, orbiterMaterial)
  orbiter.position.x = orbitPathRadius
  satellitePivot.add(orbiter)

  /** 用新参数设置锚点：更靠近月亮、更自然 */
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
    // 修改这里：将垂直旋转（rotation.x）改为水平旋转（rotation.y）
    mainShape.rotation.y += 0.001
    renderer.render(scene, camera)
    animationFrameId = requestAnimationFrame(animate)
  }
  animate()

  window.addEventListener('wheel', handleMouseWheel)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('wheel', handleMouseWheel)
  window.removeEventListener('resize', handleResize)
  renderer.dispose()
  scene.clear()
})

/** 跳转到指定页面 */
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
  currentIndex.value =
    (currentIndex.value - 1 + contentData.value.length) % contentData.value.length
}

watch(currentIndex, (newIndex) => {
  isAnimating = true
  const targetItem = contentData.value[newIndex]
  const targetRotationY = targetItem.targetRotationY
  const currentRotation = mainShape.rotation.y

  let diff = targetRotationY - currentRotation
  if (Math.abs(diff) > Math.PI) diff -= Math.sign(diff) * 2 * Math.PI

  const tl = gsap.timeline({ onComplete: () => { isAnimating = false } })

  tl.to(
    currentBgColor,
    {
      value: targetItem.color,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        currentBgColor.value =
          (gsap.getProperty(currentBgColor, 'value') as string) || targetItem.color
      },
    },
    0,
  )
  .to(
    mainShape.rotation,
    {
      y: currentRotation + diff,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: updateTextPosition,
    },
    0,
  )
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
