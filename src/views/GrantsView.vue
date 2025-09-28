<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

// 控制弹窗显示
const showConfirmDialog = ref(false)
const currentLink = ref('')
const expandedCards = ref(new Set())
const selectedCategory = ref('all')
const { t, tm, locale } = useI18n()
const router = useRouter()

// Dynamic citabot image based on locale
const citabotImage = computed(() => {
  switch (locale.value) {
    case 'ms':
      return '/images/citabot-ms.png'
    case 'zh-CN':
      return '/images/citabot-zh.png'
    case 'en':
    default:
      return '/images/citabot.png'
  }
})

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

// Grant categories mapping
const grantCategories = [
  'career-return',      // 0: Career Comeback Programme
  'career-return',      // 1: Employer Tax Incentives
  'work-arrangement',   // 2: Flexible Work Arrangement
  'family-support',     // 3: Enhanced Family Care Support
  'leadership',         // 4: Women's Empowerment Corporate Initiative
  'career-return',      // 5: MYFutureJobs Women initiative
  'education',          // 6: MYFutureJobs Training and Job Placement
  'education',          // 7: TalentCorp For Professionals
  'employment-security', // 8: Employment Insurance System
  'business',           // 9: Special Business Financing Scheme
  'leadership',         // 10: PERANTIS
  'comprehensive',      // 11: iJPW
  'business',           // 12: Women in Business (BI WinBiz)
  'business'            // 13: MADANI WANITA-i
]

// Category options - 使用国际化
const categories = computed(() => [
  { value: 'all', label: t('grantsPage.categories.all'), color: '#6B7280' },
  { value: 'career-return', label: t('grantsPage.categories.careerReturn'), color: '#10B981' },
  { value: 'education', label: t('grantsPage.categories.education'), color: '#3B82F6' },
  { value: 'business', label: t('grantsPage.categories.business'), color: '#F59E0B' },
  { value: 'family-support', label: t('grantsPage.categories.familySupport'), color: '#EF4444' },
  { value: 'work-arrangement', label: t('grantsPage.categories.workArrangement'), color: '#8B5CF6' },
  { value: 'leadership', label: t('grantsPage.categories.leadership'), color: '#EC4899' },
  { value: 'employment-security', label: t('grantsPage.categories.employmentSecurity'), color: '#06B6D4' },
  { value: 'comprehensive', label: t('grantsPage.categories.comprehensive'), color: '#84CC16' }
])

// Grant data structure
interface GrantItem {
  title: string
  target: string
  items?: string[]
}

// Get grants data from i18n translations
const grantsData = computed<GrantItem[]>(() => {
  return tm('grantsPage.grants') as GrantItem[]
})

// Filtered grants based on selected category
const filteredGrants = computed(() => {
  if (selectedCategory.value === 'all') {
    return grantsData.value.map((grant, index) => ({ grant, index, link: grantLinks[index] }))
  }

  return grantsData.value
    .map((grant, index) => ({ grant, index, link: grantLinks[index] }))
    .filter((_, index) => grantCategories[index] === selectedCategory.value)
})

// Get category info by value
const getCategoryInfo = (value: string) => {
  return categories.value.find(cat => cat.value === value) || categories.value[0]
}

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

// 重置展开状态当筛选改变时
const handleCategoryChange = () => {
  expandedCards.value.clear()
}
</script>

<template>
  <div class="grants-page">
    <!-- 头部区域 - 包含标题和副标题，以及右侧筛选器 -->
    <div class="page-header">
      <div class="header-content">
        <!-- 左侧占位，保持标题居中 -->
        <div class="header-spacer"></div>

        <!-- 中央标题区域 -->
        <div class="title-section">
          <h1 class="grants-title">{{ t('grantsPage.title') }}</h1>
          <p class="grants-subtitle">
            {{ t('grantsPage.subtitle') }}
          </p>
        </div>

        <!-- 右侧筛选器 -->
        <div class="filter-section">
          <div class="filter-container">
            <select
              v-model="selectedCategory"
              @change="handleCategoryChange"
              class="category-filter"
            >
              <option
                v-for="category in categories"
                :key="category.value"
                :value="category.value"
              >
                {{ category.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 卡片滚动区域 -->
    <div class="cards-scroll-area">
      <div class="cards-wrapper">
        <!-- 动态生成筛选后的Grant卡片 -->
        <div
          v-for="({ grant, index, link }, displayIndex) in filteredGrants"
          :key="index"
          class="grant-card"
        >
          <!-- 卡片主体内容 -->
          <div class="card-content">
            <div class="card-number">{{ displayIndex + 1 }}</div>
            <div class="card-text">
              <h3 class="card-title">{{ grant.title }}</h3>
            </div>
            <div class="card-buttons">
              <!-- 分类标签 -->
              <span
                class="category-tag"
                :style="{ backgroundColor: getCategoryInfo(grantCategories[index]).color }"
              >
                {{ getCategoryInfo(grantCategories[index]).label }}
              </span>
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
                @click="handleLearnMore(link)"
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

        <!-- 无结果提示 -->
        <div v-if="filteredGrants.length === 0" class="no-results">
          <p class="no-results-text">No grants found in this category.</p>
        </div>
      </div>
    </div>

    <!-- Citabot Icon -->
    <div class="fixed bottom-1 right-1 z-1">
      <img
        :src="citabotImage"
        alt="Citabot"
        class="w-50 h-50 cursor-pointer transition-transform duration-300 ease-out hover:scale-110 object-contain"
        style="width: 200px; height: 200px; max-width: 200px; max-height: 200px;"
        @click="router.push('/ai')"
      />
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
  padding: 140px 20px 20px 20px;
  background: transparent;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr minmax(300px, 600px) 280px;
  align-items: start;
  gap: 20px;
  width: 100%;
}

.header-spacer {
  /* 左侧占位，保持标题居中 */
}

.title-section {
  text-align: center;
  justify-self: center;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  white-space: nowrap;
}

/* 筛选器区域 - 右侧位置，无"Filter by Category"标签 */
.filter-section {
  justify-self: end;
  margin-top: 20px;
}

.filter-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 280px;
}

.category-filter {
  font-family: 'Noto Sans', sans-serif;
  font-size: 13px;
  padding: 8px 28px 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #2D3748;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  min-width: 0;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 14px;
}

.category-filter:focus {
  background-color: rgba(74, 85, 104, 0.1);
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
  flex-wrap: wrap;
}

.category-tag {
  font-family: 'Noto Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  white-space: nowrap;
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

/* 无结果提示 */
.no-results {
  text-align: center;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.no-results-text {
  font-family: 'Noto Sans', sans-serif;
  font-size: 18px;
  color: #6B7280;
  margin: 0;
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

  .header-content {
    grid-template-columns: 1fr;
    gap: 20px;
    text-align: center;
  }

  .header-spacer {
    display: none;
  }

  .title-section {
    text-align: center;
  }

  .grants-title {
    font-size: 48px;
    margin: 0 0 10px 0;
  }

  .grants-subtitle {
    font-size: 18px;
    white-space: normal;
  }

  .filter-section {
    justify-self: center;
    margin-top: 0;
    width: 100%;
  }

  .filter-container {
    width: 100%;
    max-width: 350px;
    margin: 0 auto;
  }

  .category-filter {
    padding: 8px 28px 8px 12px;
    font-size: 13px;
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

  .card-buttons {
    flex-wrap: wrap;
    gap: 8px;
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
