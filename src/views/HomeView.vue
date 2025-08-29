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
        class="absolute p-8 rounded-full bg-white/10 backdrop-blur-md pointer-events-auto shadow-xl border border-white/20"
        style="will-change: transform; top: 0; left: 0; min-width: 280px; min-height: 280px; display: flex; align-items: center; justify-content: center;"
      >
        <transition name="fade" mode="out-in">
          <div :key="currentIndex" class="text-white text-center max-w-xs">
            <!-- 框内文本显示 -->
            <p class="text-base md:text-lg font-medium text-white text-center drop-shadow-lg whitespace-pre-line leading-relaxed">
              {{ contentData[currentIndex].description }}
            </p>
          </div>
        </transition>
      </div>
    </div>

    <!-- 按钮 -->
    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
      <button
        class="px-12 py-5 bg-white/20 text-xl font-semibold backdrop-blur-sm text-white rounded-full hover:bg-white/40 transition-colors shadow-md"
        @click="handleButtonClick"
      >
        {{ contentData[currentIndex].buttonText }}
      </button>
    </div>

    <!-- 切换按钮
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
    </button> -->

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
import { useRouter } from 'vue-router'              // ★ CHANGED: 启用路由
const router = useRouter()                          // ★ CHANGED: 获取 router 实例

/** ============== 可调参数（让文字圆更靠近月亮） ============== */
const BUBBLE_DISTANCE = 1.7   // 距离月亮中心（球半径≈1.2）。越小越靠近月亮，建议 1.6~1.9
const BUBBLE_HEIGHT   = 0.15  // 垂直偏移，正值向上
const PROJ_X_SCALE    = 0.55  // 屏幕投影X缩放（原0.7），越小越贴近真实位置
const PROJ_Y_SCALE    = 0.55  // 屏幕投影Y缩放（原0.5）

interface ContentItem {
  title: string
  description: string
  targetRotationY: number
  color: string
  path: string
  buttonText: string
  backgroundImage: string
}

const mainContainerRef: Ref<HTMLDivElement | null> = ref(null)
const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)
const textContainerRef: Ref<HTMLDivElement | null> = ref(null)

const contentData = ref<ContentItem[]>([
  {
    title: 'Jobs for Me',
    description: 'Did you know\n one out of two women\n don\'t work in Malaysia?',
    targetRotationY: 0, //0度
    color: '#312e81',
    buttonText: 'Learn More',
    path: '/jobs',
    backgroundImage: '/images/homepage-jobs-for-me.png',
  },
  {
    title: 'Map',
    description: 'A lot of women struggle\n with family responsibilities\nand financial stability.',
    targetRotationY: Math.PI / 3, //60度
    color: '#1e293b',
    buttonText: 'Learn More',
    path: '/map',
    backgroundImage: '/images/map.png',
  },
    {
    title: 'Jobs for Me',
    description: 'Do you want to\nreturn to your career?',
    targetRotationY: (2 * Math.PI) / 3, //120度
    color: '#dc2626',
    buttonText: 'Learn More',
    path: '/jobs',
    backgroundImage: '/images/jobs-for-me.png',
  },
  {
    title: 'AI Tools',
    description: 'Worried about\ninterviews and\nmaking resumes?',
    targetRotationY: Math.PI, //180度
    color: '#064e3b',
    buttonText: 'Learn More',
    path: '/ai',
    backgroundImage: '/images/ai-tools.png',
  },
  {
    title: 'Grants',
    description: 'Looking for financial\nsupport as a mother?',
    targetRotationY: (4 * Math.PI) / 3, //240度
    color: '#7c3aed',
    buttonText: 'Learn More',
    path: '/grants',
    backgroundImage: '/images/grants.png',
  },
  {
    title: 'FAQ',
    description: 'CitaCita is here to\nsupport you!',
    targetRotationY: (5 * Math.PI) / 3, //300度
    color: '#059669',
    buttonText: 'Learn More',
    path: '/faq',
    backgroundImage: '/images/faq.png',
  },
])

const currentIndex = ref(0)
const currentBgColor = ref(contentData.value[0].color)

let scene: Scene
let camera: PerspectiveCamera
let renderer: WebGLRenderer
let mainShape: Mesh
let textAnchor: Object3D
let satellitePivot: Object3D
let animationFrameId: number
let isAnimating = false
const anchorPositionVector = new Vector3()

/** 计算并更新文字圆的位置（用了新的投影缩放系数） */
const updateTextPosition = () => {
  if (!textContainerRef.value || !mainContainerRef.value) return
  textAnchor.getWorldPosition(anchorPositionVector)
  anchorPositionVector.project(camera)

  const { clientWidth: width, clientHeight: height } = mainContainerRef.value
  const { offsetWidth: boxWidth, offsetHeight: boxHeight } = textContainerRef.value

  const x = (anchorPositionVector.x * PROJ_X_SCALE + 0.5) * width
  const y = (-anchorPositionVector.y * PROJ_Y_SCALE + 0.5) * height

  const clampedX = Math.max(boxWidth / 2, Math.min(x, width - boxWidth / 2))
  const clampedY = Math.max(boxHeight / 2, Math.min(y, height - boxHeight / 2))

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

  const geometry = new SphereGeometry(1.2, 64, 64)
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

  const orbitPathRadius = 2.0
  const orbitGroup = new Object3D()
  orbitGroup.rotation.z = Math.PI / 16
  orbitGroup.rotation.x = Math.PI / 32
  mainShape.add(orbitGroup)

  const orbitGeometry = new TorusGeometry(orbitPathRadius, 0.005, 8, 100)
  const orbitMaterial = new MeshBasicMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.4,
  })
  const orbit = new Mesh(orbitGeometry, orbitMaterial)
  orbit.rotation.x = Math.PI / 2
  orbitGroup.add(orbit)

  satellitePivot = new Object3D()
  orbitGroup.add(satellitePivot)

  const orbiterGeometry = new SphereGeometry(0.06, 16, 16)
  const orbiterMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
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
    mainShape.rotation.x += 0.001
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
  router.push(targetPath)                               // ★ CHANGED: 真正跳转，而不是 alert
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
