<script setup lang="ts">
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { getRecommendedProducts, searchProductsByNotifNo } from '@/api'
import { ScrollArea } from '@/components/ui/scroll-area'

onBeforeRouteUpdate((to, from, next) => {
  fetchData(to.params.notifNo as string);
  next();
});

const route = useRoute();
const router = useRouter();
const productDetail = ref({
  notifNo: '',
  product: '',
  company: '',
  status: false,
  dateNotif: '',
  substanceDetected: [],
} as any);

const recommendedProducts = ref();
const loading = ref(true);

const fetchData = async (notifNo: string) => {
  loading.value = true;
  try {
    // 使用 Promise.all 等待所有请求完成
    await Promise.all([
      searchProductsByNotifNo({ notifNo }).then(response => {
        productDetail.value = response.data;
      }),
      getRecommendedProducts().then(response => {
        recommendedProducts.value = response.data;
      })
    ]);
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    loading.value = false;
  }
};

const handleClickRecommendation = (notifNo: string) => {
  router.push({
    name: 'productDetail',
    params: { notifNo: notifNo },
  });
};

const handleClickSubstance = (substance: string) => {
  router.push({
    name: 'IngredientsDetailView',
    params: { ingredientName: encodeURIComponent(substance) },
  });
};

onMounted(() => {
  fetchData(route.params.notifNo as string);
});
</script>

<template>
  <div class="page">
    <!-- 产品名称 -->
    <h1 class="product-name">{{ productDetail.product }}</h1>

    <!-- 红色警告框 -->
    <div class="alert-box" v-if="productDetail.status === false">
      <scroll-area class="h-9/10 w-2/3">
        <div class="reasoning-text">Risk Indicator: Unsafe</div>
        <div class="reasoning-text mt-4">
          Reasoning: Contains
          <span
            class="underline cursor-pointer"
            v-for="(substance, index) in productDetail.substanceDetected"
            :key="index"
            @click="handleClickSubstance(substance)"
          >
            {{ substance }}<span v-if="index < productDetail.substanceDetected.length - 1">, </span>
          </span>
        </div>
        <div class="reasoning-text mt-4">Notification Number: {{ productDetail.notifNo }}</div>
      </scroll-area>
      <div class="unsafe-tag">
        <img src="/thumbs-down.png" alt="Thumbs Down" class="thumb-icon" />
        <span class="unsafe-text">UNSAFE</span>
      </div>
    </div>

    <!--    Safe-->
    <div class="safe-box" v-else>
      <scroll-area class="h-9/10 w-2/3">
        <p class="reasoning-text">Company: {{ productDetail.company }}</p>
        <p class="reasoning-text mt-4">Notification Date: {{ productDetail.dateNotif }}</p>
        <p class="reasoning-text mt-4">Notification Number: {{ productDetail.notifNo }}</p>
      </scroll-area>
      <div class="unsafe-tag">
        <img src="/thumbs-down.png" alt="Thumbs Down" class="thumb-up-icon" />
        <span class="unsafe-text">SAFE</span>
      </div>
    </div>

    <!-- 推荐产品区域 -->
    <div class="safe-products-section">
      <h2 class="subtitle">Other Approved & Safe Products</h2>
      <div v-if="loading" class="loading-wrapper">
        <div
          class="size-16 border-4 border-gray-300 border-t-[#a14724] rounded-full animate-spin"
        ></div>
      </div>
      <div v-else class="products-wrapper">
        <div class="products-grid">
          <div
            v-for="(item, index) in recommendedProducts"
            :key="index"
            class="product-card"
            @click="handleClickRecommendation(item.notifNo)"
          >
            <strong>{{ item.product }}</strong
            ><br />
            <small>{{ item.company }}</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 2rem 0;
  background: linear-gradient(to bottom, #b46639, #fff2ea);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  flex: 1;
  color: white;
  text-align: center;
  overflow-x: hidden;
}

.product-name {
  font-family: 'Poppins', sans-serif;
  font-weight: 400;
  font-size: 64px;
  line-height: 100%;
  letter-spacing: 1%;
  height: 96px;
  margin: 0 auto;
  color: #ffffff;
}

.alert-box {
  background-color: #c20000;
  color: white;
  width: 100%;
  max-width: 1342px;
  height: 257px;
  border-radius: 30px;
  padding: 2rem;
  margin: 2rem auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 4px 4px 4px rgba(0, 0, 0, 0.25);
}

.safe-box {
  background-color: #00a000;
  color: white;
  width: 100%;
  max-width: 1342px;
  height: 257px;
  border-radius: 30px;
  padding: 2rem;
  margin: 2rem auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 4px 4px 4px rgba(0, 0, 0, 0.25);
}

.reasoning-text {
  font-family: 'Poppins', sans-serif;
  font-weight: 400;
  font-size: 32px;
  line-height: 125%;
  letter-spacing: 0.01em;
  color: #ffffff;
  text-align: left;
  max-width: 609px;
}

.reasoning-text p {
  margin: 0;
  line-height: 100%;
}

.unsafe-tag {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  flex-shrink: 0;
}

.thumb-icon {
  width: 65px;
  height: 72px;
}

.thumb-up-icon {
  width: 65px;
  height: 72px;
  scale: -1;
}

.unsafe-text {
  font-family: 'Poppins', sans-serif;
  font-weight: 800;
  font-size: 64px;
  line-height: 100%;
  letter-spacing: 1%;
  color: white;
}

/* ✅ 推荐产品区域 */
.safe-products-section {
  width: 100%;
  background-color: #fcfcfc;
  box-shadow: inset 0px 4px 4px rgba(0, 0, 0, 0.25);
  border-radius: 0;
  padding: 2rem 2rem;
  display: flex;
  flex-direction: column; /* ✅ 垂直布局 */
  align-items: center; /* ✅ 内容居中 */
  flex: 1;
  box-sizing: border-box;
  gap: 2rem; /* ✅ 标题和产品间距 */
}

.products-wrapper {
  background-color: #fcfcfc;
  border-radius: 0px; /* ✅ 外框不带圆角 */
  width: 90%;
  max-width: 1342px;
  box-sizing: border-box;
  margin: 0 auto;
}

.loading-wrapper {
  background-color: #fcfcfc;
  border-radius: 0px; /* ✅ 外框不带圆角 */
  width: 90%;
  max-width: 1342px;
  padding: 2rem;
  box-sizing: border-box;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.subtitle {
  font-family: 'Poppins', sans-serif;
  font-size: 36px;
  font-weight: 600;
  line-height: 100%;
  letter-spacing: 1%;
  color: black;
  text-align: center;
  margin: 0;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* ✅ 固定为2列 */
  grid-template-rows: repeat(2, auto); /* ✅ 强制2行（由数据控制）*/
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

.product-card {
  background-color: #ffffff;
  border: none;
  border-radius: 12px; /* ✅ 卡片内部圆角 */
  padding: 16px;
  color: black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;
  height: 100%;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); /* ✅ 更自然的卡片阴影 */
}

.product-card:hover {
  transform: translateY(-2px);
  transition: all 0.2s ease-in-out;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}
</style>
