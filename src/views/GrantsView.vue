<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

// 控制弹窗显示
const showConfirmDialog = ref(false)
const currentLink = ref('')
const expandedCards = ref(new Set())
const { t, tm } = useI18n()

// Grant链接数据
const grantLinks = [
  "https://www.talentcorp.com.my/ccp",
  "https://www.investmalaysia.gov.my/media/k0dc3vme/budget-2025-tax-measures.pdf",
  "https://www.talentcorp.com.my/resources/press-releases/launch-of-the-flexible-work-arrangement-fwa-guidelines/",
  "https://www.hasil.gov.my/en/individual/individual-life-cycle/how-to-declare-income/tax-reliefs/",
  "https://asiapacific.unwomen.org/en/stories/press-release/2025/05/first-malaysia-womens-empowerment-principles-corporate-action-lab-to-advance-gender-equality-in-business",
  "https://myfuturejobs.gov.my/women/",
  "https://myfuturejobs.gov.my/training-programmes/",
  "https://www.talentcorp.com.my/our-initiatives/for-professionals/",
  "https://www.perkeso.gov.my/en/our-services/protection/employment-insurance.html",
  "https://www.mara.gov.my/en/index/ent-menu/support-facilities/ent-business-finance/dananita/",
  "https://www.jpw.gov.my/index.php/ms/services-jpw/perantis",
  "https://ijpw.jpw.gov.my/",
  "https://www.bankislam.com/business-banking/sme-banking/winbiz-financing/",
  "https://www.bsn.com.my/page/MadaniWanita-i"
]

// Grant data structure
interface GrantItem {
  title: string
  target: string
  items?: string[]
}

// Get grants data from i18n translations - 仿照FAQ的方式
const grantsData = computed<GrantItem[]>(() => {
  return tm('grantsPage.grants') as GrantItem[]
})

// 切换卡片展开状态
const toggleCard = (index: number) => {
  const newExpanded = new Set(expandedCards.value)
  if (newExpanded.has(index)) {
    newExpanded.delete(index)
  } else {
    newExpanded.add(index)
  }
  expandedCards.value = newExpanded
}

// 处理Learn More点击
const handleLearnMore = (link: string) => {
  currentLink.value = link
  showConfirmDialog.value = true
}

// 确认跳转
const confirmNavigation = () => {
  window.open(currentLink.value, '_blank')
  showConfirmDialog.value = false
}

// 取消跳转
const cancelNavigation = () => {
  showConfirmDialog.value = false
  currentLink.value = ''
}
</script>

<template>
  <div class="grants-page">
    <!-- 头部区域 - 包含标题和副标题 -->
    <div class="page-header">
      <h1 class="grants-title">{{ t('grantsPage.title') }}</h1>
      <p class="grants-subtitle">
        {{ t('grantsPage.subtitle') }}
      </p>
    </div>

    <!-- 卡片滚动区域 -->
    <div class="cards-scroll-area">
      <div class="cards-wrapper">
        <!-- 动态生成所有14个Grant卡片 -->
        <div
          v-for="(grant, index) in grantsData"
          :key="index"
          class="grant-card"
        >
          <!-- 卡片主体内容 -->
          <div class="card-content">
            <div class="card-number">{{ index + 1 }}</div>
            <div class="card-text">
              <h3 class="card-title">{{ grant.title }}</h3>
            </div>
            <div class="card-buttons">
              <!-- 展开按钮 -->
              <button
                class="expand-btn"
                @click="toggleCard(index)"
              >
                <svg
                  :class="{ 'rotate-180': expandedCards.has(index) }"
                  class="expand-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
              <!-- Learn More按钮 -->
              <button
                class="learn-more-btn"
                @click="handleLearnMore(grantLinks[index])"
              >
                {{ t('grantsPage.learnMore') }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15,3 21,3 21,9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- 展开的详细信息 -->
          <div v-if="expandedCards.has(index)" class="card-details">
            <div class="detail-content">
              <div class="target-section">
                <span class="target-label">{{ t('grantsPage.target') }}</span>
                <p class="target-text">{{ grant.target }}</p>
              </div>

              <!-- 其他详细信息 -->
              <div v-if="grant.items && grant.items.length > 0" class="items-section">
                <div
                  v-for="(item, itemIndex) in grant.items"
                  :key="itemIndex"
                  class="detail-item"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认跳转弹窗 -->
    <div v-if="showConfirmDialog" class="dialog-overlay">
      <div class="dialog-content">
        <h3 class="dialog-title">{{ t('grantsPage.confirmDialog.title') }}</h3>
        <div class="dialog-actions">
          <button class="dialog-btn cancel-btn" @click="cancelNavigation">{{ t('grantsPage.confirmDialog.cancel') }}</button>
          <button class="dialog-btn open-btn" @click="confirmNavigation">{{ t('grantsPage.confirmDialog.open') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');

/* 页面容器 */
.grants-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 0;
}

/* 页面头部 */
.page-header {
  flex-shrink: 0;
  text-align: center;
  padding: 140px 20px 20px 20px;
  background: transparent;
}

.grants-title {
  font-family: 'Noto Sans', sans-serif;
  font-weight: 700;
  font-size: 64px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.grants-subtitle {
  font-family: 'Noto Sans', sans-serif;
  font-size: 25px;
  font-weight: 400;
  color: #FFFFFF;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 卡片滚动区域 */
.cards-scroll-area {
  flex: 1;
  overflow: hidden;
  padding: 0 20px 20px 20px;
}

.cards-wrapper {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.5) rgba(255, 255, 255, 0.1);
}

.cards-wrapper::-webkit-scrollbar {
  width: 8px;
}

.cards-wrapper::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.cards-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cards-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.7);
}

/* 单个卡片样式 */
.grant-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.grant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 20px;
}

.card-number {
  width: 40px;
  height: 40px;
  background: #4A5568;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Noto Sans', sans-serif;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.card-text {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-family: 'Noto Sans', sans-serif;
  font-weight: 700;
  font-size: 16px;
  color: #2D3748;
  margin: 0;
  line-height: 1.3;
}

.card-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.expand-btn {
  width: 40px;
  height: 40px;
  background: #E2E8F0;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #4A5568;
}

.expand-btn:hover {
  background: #CBD5E0;
}

.expand-icon {
  transition: transform 0.3s ease;
}

.expand-icon.rotate-180 {
  transform: rotate(180deg);
}

.learn-more-btn {
  background: #4A5568;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-family: 'Noto Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.learn-more-btn:hover {
  background: #2D3748;
}

/* 展开的详细信息区域 */
.card-details {
  border-top: 1px solid #E2E8F0;
  background: #F7FAFC;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}

.detail-content {
  padding: 20px;
}

.target-section {
  margin-bottom: 16px;
}

.target-label {
  font-family: 'Noto Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #2D3748;
  display: block;
  margin-bottom: 8px;
}

.target-text {
  font-family: 'Noto Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #2D3748;
  margin: 0;
  line-height: 1.5;
  white-space: pre-line;
}

.items-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  font-family: 'Noto Sans', sans-serif;
  font-size: 14px;
  color: #4A5568;
  line-height: 1.5;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  font-family: 'Noto Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #2D3748;
  margin: 0 0 20px 0;
  text-align: center;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-family: 'Noto Sans', sans-serif;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  min-width: 80px;
}

.cancel-btn {
  background: #E2E8F0;
  color: #4A5568;
}

.cancel-btn:hover {
  background: #CBD5E0;
}

.open-btn {
  background: #3182CE;
  color: white;
}

.open-btn:hover {
  background: #2C5282;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: 110px 15px 15px 15px;
  }

  .grants-title {
    font-size: 48px;
    margin: 0 0 10px 0;
  }

  .grants-subtitle {
    font-size: 18px;
  }

  .cards-scroll-area {
    padding: 10px 15px 25px 15px;
  }

  .card-content {
    padding: 16px;
    gap: 12px;
  }

  .card-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .card-title {
    font-size: 14px;
  }

  .expand-btn {
    width: 36px;
    height: 36px;
  }

  .learn-more-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
