<template>
  <div
    ref="mainContainerRef"
    class="w-full h-full fixed top-0 left-0 overflow-hidden transition-colors duration-1000 ease-in-out"
    :style="{ backgroundColor: currentBgColor }"
  >
    <canvas ref="canvasRef" class="absolute top-0 left-0 w-full h-full"></canvas>

    <!-- 文本容器 -->
    <div class="absolute top-0 left-0 z-10 w-full h-full pointer-events-none">
      <div
        ref="textContainerRef"
        class="absolute p-6 rounded-lg bg-black/30 backdrop-blur-md pointer-events-auto shadow-xl"
        style="will-change: transform; top: 0; left: 0"
      >
        <transition name="fade" mode="out-in">
          <div :key="currentIndex" class="text-white w-64 md:w-80">
            <h1 class="text-2xl md:text-3xl font-bold mb-3 drop-shadow-lg">
              {{ contentData[currentIndex].title }}
            </h1>
            <p class="text-sm md:text-base text-gray-200">
              {{ contentData[currentIndex].description }}
            </p>
          </div>
        </transition>
      </div>
    </div>

    <!-- 按钮 -->
    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
      <button
        class="px-8 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/40 transition-colors shadow-md"
        @click="handleButtonClick"
      >
        {{ contentData[currentIndex].buttonText }}
      </button>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Ref, watch } from 'vue'
// 精准导入 THREE 的类
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  DodecahedronGeometry,
  Object3D,
  Vector3,
  DirectionalLight,
  AmbientLight,
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  TorusGeometry,
  Color,
  SphereGeometry
} from 'three'
// 精准导入 gsap
import { gsap } from 'gsap'
// import { useRouter } from 'vue-router' // 如果使用路由

// const router = useRouter() // 如果使用路由

interface ContentItem {
  title: string
  description: string
  targetRotationY: number
  color: string
  path: string
  buttonText: string
}

const mainContainerRef: Ref<HTMLDivElement | null> = ref(null)
const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)
const textContainerRef: Ref<HTMLDivElement | null> = ref(null)

const contentData = ref<ContentItem[]>([
  {
    title: 'Map',
    description: 'this is a description for map',
    targetRotationY: 0,
    color: '#1e293b',
    buttonText: 'Explore Map',
    path: '/p1',
  },
  {
    title: 'Job',
    description: 'this is a description for job',
    targetRotationY: (2 * Math.PI) / 3,
    color: '#312e81',
    buttonText: 'Find Jobs',
    path: '/p2',
  },
  {
    title: 'AI',
    description: 'this is a description for AI',
    targetRotationY: (4 * Math.PI) / 3,
    color: '#064e3b',
    buttonText: 'Try AI',
    path: '/p3',
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

const updateTextPosition = () => {
  if (!textContainerRef.value || !mainContainerRef.value) return
  textAnchor.getWorldPosition(anchorPositionVector)
  anchorPositionVector.project(camera)
  const { clientWidth: width, clientHeight: height } = mainContainerRef.value
  const { offsetWidth: boxWidth, offsetHeight: boxHeight } = textContainerRef.value
  const x = (anchorPositionVector.x * 0.7 + 0.5) * width
  const y = (-anchorPositionVector.y * 0.5 + 0.5) * height
  const clampedX = Math.max(boxWidth / 2, Math.min(x, width - boxWidth / 2))
  const clampedY = Math.max(boxHeight / 2, Math.min(y, height - boxHeight / 2))
  textContainerRef.value.style.transform = `translate(-50%, -50%) translate(${clampedX}px, ${clampedY}px)`
}

onMounted(() => {
  if (!canvasRef.value || !mainContainerRef.value) return
  const { clientWidth, clientHeight } = mainContainerRef.value

  scene = new Scene()
  camera = new PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000)
  camera.position.z = 4
  renderer = new WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  renderer.setSize(clientWidth, clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 主模型
  const geometry = new DodecahedronGeometry(1.4, 0)
  const material = new MeshStandardMaterial({
    color: new Color(contentData.value[currentIndex.value].color),
    metalness: 0.2,
    roughness: 0.6,
  })
  mainShape = new Mesh(geometry, material)
  scene.add(mainShape)

  // 线框
  const wireframeGeometry = new DodecahedronGeometry(1.41, 0)
  const wireframeMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    opacity: 0.1,
    transparent: true,
  })
  const wireframe = new Mesh(wireframeGeometry, wireframeMaterial)
  mainShape.add(wireframe)

  // 轨道系统
  const orbitPathRadius = 2.0
  const orbitGroup = new Object3D()
  orbitGroup.rotation.z = Math.PI / 16
  orbitGroup.rotation.x = Math.PI / 32
  mainShape.add(orbitGroup)

  const orbitGeometry = new TorusGeometry(orbitPathRadius, 0.01, 16, 100)
  const orbitMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
  })
  const orbit = new Mesh(orbitGeometry, orbitMaterial)
  orbit.rotation.x = Math.PI / 2
  orbitGroup.add(orbit)

  satellitePivot = new Object3D()
  orbitGroup.add(satellitePivot)

  const orbiterGeometry = new SphereGeometry(0.08, 16, 16)
  const orbiterMaterial = new MeshStandardMaterial({ color: 0x708090, roughness: 0.2 })
  const orbiter = new Mesh(orbiterGeometry, orbiterMaterial)
  orbiter.position.x = orbitPathRadius
  satellitePivot.add(orbiter)

  // 锚点
  textAnchor = new Object3D()
  textAnchor.position.set(2.3, 0.3, 0)
  mainShape.add(textAnchor)

  // 光照
  const light = new DirectionalLight(0xffffff, 3.0)
  light.position.set(2, 2, 5)
  scene.add(light)
  scene.add(new AmbientLight(0xffffff, 0.5))

  // 星空背景
  const starGeometry = new BufferGeometry()
  const starCount = 500
  const positions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 20
  starGeometry.setAttribute('position', new BufferAttribute(positions, 3))
  const starMaterial = new PointsMaterial({ color: 0xffffff, size: 0.05 })
  const stars = new Points(starGeometry, starMaterial)
  scene.add(stars)

  mainShape.rotation.y = contentData.value[currentIndex.value].targetRotationY
  mainShape.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  updateTextPosition()

  const animate = () => {
    satellitePivot.rotation.y += 0.002
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
  const targetColor = new Color(targetItem.color)

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
      (mainShape.material as MeshStandardMaterial).color,
      {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.2,
        ease: 'power2.inOut',
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
  alert('Navigate to: ' + targetPath)
  // router.push(targetPath)
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
