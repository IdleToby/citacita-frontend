<template>
  <div class="questionnaire">
    <h2>{{ $t('quiz.title') }}</h2>

    <!-- Progress Bar -->
    <div v-if="currentQuestion < questions.length" class="progress-container">
      <div class="progress-info">
        <span class="progress-text">{{ $t('quiz.progress.question', { current: currentQuestion + 1, total: expectedTotalQuestions }) }}</span>
        <span class="remaining-text">{{ $t('quiz.progress.remaining', { remaining: expectedTotalQuestions - currentQuestion - 1 }) }}</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: ((currentQuestion + 1) / expectedTotalQuestions) * 100 + '%' }"
        ></div>
      </div>
    </div>

    <!-- 问题显示 -->
    <div v-if="currentQuestion < questions.length">
      <p>{{ getQuestionText(currentQuestion) }}</p>
      <div v-for="(option, idx) in questions[currentQuestion].options" :key="idx" class="option-container">
        <div class="option-wrapper">
          <label class="option-with-tooltip">
            <input
              type="radio"
              :name="'q' + currentQuestion"
              :value="getOptionValue(option)"
              v-model="answers[currentQuestion]"
            />
            <span class="option-text">
              {{ getOptionText(option) }}
            </span>
          </label>
          <span
            v-if="hasDescription(option)"
            class="info-icon"
            @click="toggleDescription(idx)"
          >
            {{ expandedDescriptions[currentQuestion + '-' + idx] ? '−' : '+' }}
          </span>
        </div>
        <!-- 可展开的描述 -->
        <div
          v-if="hasDescription(option) && expandedDescriptions[currentQuestion + '-' + idx]"
          class="description-panel"
        >
          {{ getOptionDescription(option) }}
        </div>
      </div>

      <div class="buttons">
        <button @click="prevQuestion" :disabled="currentQuestion === 0">{{ $t('quiz.buttons.previous') }}</button>
        <button
          @click="nextQuestion"
          :disabled="!answers[currentQuestion]"
          :class="{ 'submit-button': isLastQuestion }"
        >
          {{ isLastQuestion ? $t('quiz.buttons.submit') : $t('quiz.buttons.next') }}
        </button>
      </div>
    </div>

    <!-- 结果显示 -->
    <div v-else>
      <h3>{{ $t('quiz.results.title') }}</h3>

      <div v-if="recommendedUnits[0]?.unit_group_code === 'No matching results'">
        <p>{{ $t('quiz.results.noResults') }}</p>
      </div>

      <div v-else>
        <div class="results-summary">
          <p><strong>{{ $t('quiz.results.summary') }}</strong></p>
          <div class="analysis-details">
            <h4>{{ $t('quiz.results.profileAnalysis') }}</h4>
            <div class="profile-tags">
              <span class="tag education-tag">{{ $t('quiz.results.education') }}: {{ getEducationText(answers[0]) }}</span>
              <span class="tag field-tag">{{ $t('quiz.results.field') }}: {{ getJobAreaText(answers[1]) }}</span>
              <span class="tag keywords-tag">{{ $t('quiz.results.keyInterests', { count: extractUserSelectedKeywords().length }) }}</span>
            </div>
          </div>
        </div>

        <p>{{ $t('quiz.results.topMatches') }}</p>
        <ul class="recommendation-list">
          <li v-for="(unit, index) in recommendedUnits" :key="unit.unit_group_code"
              class="recommendation-item">
            <div class="rank-title">
              <strong class="clickable-title" @click="goToJob(unit)">#{{ index + 1 }}:
                {{ translateJobTitleFromData(unit.unit_group_code, locale) }} </strong>
            </div>
            <div class="match-info">
              <span class="match-score">{{ $t('quiz.results.matchScore', { score: unit.score }) }}</span>
            </div>
            <div class="detailed-match-reason">
              <h5>{{ $t('quiz.results.whyMatches') }}</h5>
              <div v-html="unit.detailedReason"></div>
            </div>
          </li>
        </ul>
      </div>
      <div class="result-buttons">
        <button @click="restart">{{ $t('quiz.buttons.restart') }}</button>
        <button @click="finishQuiz" class="close-button">
          {{ $t('quiz.buttons.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch, nextTick} from "vue";
import { useI18n } from 'vue-i18n';
// ----------------------
// 5. 模拟数据
// ----------------------
import unitData from "@/data/unit_group_data.json";
import majorGroupKeywords from "@/data/major_group_keywords.json";
import { keywordTranslations } from "@/data/keyword_translations.js";
import {useRouter} from 'vue-router'

const emit = defineEmits(['quiz-completed'])

// 使用 vue-i18n
const { t: $t, locale } = useI18n();

// 新增：控制描述展开状态
const expandedDescriptions = reactive<Record<string, boolean>>({});

// 新增：切换描述显示
function toggleDescription(optionIndex: number) {
  const key = currentQuestion.value + '-' + optionIndex;
  expandedDescriptions[key] = !expandedDescriptions[key];
}
function getFieldSuffix(lang: string): string {
  switch(lang) {
    case 'ms': return '_malay';
    case 'zh-CN': return '_chinese';
    case 'en':
    default: return '';
  }
}

// 从数据对象中获取多语言字段值
function getMultilingualField(dataObj: any, baseFieldName: string, targetLang: string): string {
  const suffix = getFieldSuffix(targetLang);
  const fieldName = baseFieldName + suffix;
  return dataObj[fieldName] || dataObj[baseFieldName] || '';
}

// 翻译关键词
function translateKeyword(keyword: string, targetLang: string): string {
  if (targetLang === 'en') return keyword;

  const translation = keywordTranslations[keyword.toLowerCase()];
  if (translation && translation[targetLang]) {
    return translation[targetLang];
  }
  return keyword;
}

// 从unitData中查找并翻译职业标题
function translateJobTitleFromData(unitGroupCode: string, targetLang: string): string {
  const unit = unitData.find((u: any) => u.unit_group_code === unitGroupCode);
  if (unit) {
    return getMultilingualField(unit, 'unit_group_title', targetLang);
  }
  return '';
}

// ----------------------
// 1. 基础问卷问题 - 现在使用多语言
// ----------------------
const jobAreaKeys = ['managers', 'professionals', 'technicians', 'clerical', 'service', 'agricultural', 'craft', 'operators', 'elementary', 'armed'];

const baseQuestions = computed(() => [
  {
    question: $t('quiz.questions.education'),
    type: "single_choice",
    options: [
      "First Level (Primary education)",
      "Second Level (High school education)",
      "Third Level (Bachelor's degree or equivalent)",
      "Fourth Level (Master's/PhD or advanced education)"
    ],
    key: "skill_level"
  },
  {
    question: $t('quiz.questions.jobArea'),
    type: "single_choice",
    options: jobAreaKeys.map(key => ({
      key: key,
      value: $t(`quiz.jobAreas.${key}.title`),
      description: $t(`quiz.jobAreas.${key}.description`)
    })),
    key: "major_group"
  }
]);

// ----------------------
// 2. 生成随机关键词问题的函数
// ----------------------
function generateRandomKeywordQuestions(majorGroupCode: string, numQuestions: number = 5): any[] {
  const keywordData = (majorGroupKeywords as any)[majorGroupCode];
  if (!keywordData || !keywordData.keywords) {
    return [];
  }

  const keywords = [...keywordData.keywords]; // 复制数组以避免修改原数组
  const questions = [];
  const usedKeywords = new Set<string>();

  for (let i = 0; i < numQuestions; i++) {
    // 过滤掉已使用的关键词
    const availableKeywords = keywords.filter(keyword => !usedKeywords.has(keyword));

    if (availableKeywords.length < 4) {
      // 如果可用关键词不足4个，重置已使用的关键词
      usedKeywords.clear();
      availableKeywords.push(...keywords);
    }

    // 随机选择4个不重复的关键词作为选项
    const shuffled = availableKeywords.sort(() => 0.5 - Math.random());
    const selectedKeywords = shuffled.slice(0, 4);

    // 标记这些关键词为已使用
    selectedKeywords.forEach(keyword => usedKeywords.add(keyword));

    questions.push({
      question: $t('quiz.questions.activities'),
      options: selectedKeywords
    });
  }

  return questions;
}

// 计算期望的总问题数量（总是7个：2个基础 + 5个专业组问题）
const expectedTotalQuestions = computed(() => {
  return 2 + 5; // 2个基础问题 + 5个专业组问题
});

// 替换整个 isLastQuestion 计算属性
const isLastQuestion = computed(() => {
  // 如果没有选择 major group，不可能是最后一个问题
  if (!answers[1]) {
    return false;
  }

  // 找到对应的 major group code
  const selectedMajorTitle = answers[1];
  const selectedMajorCode = Object.keys(majorGroupKeywords).find(code =>
    mapMajorGroupCodeToTitle(code) === selectedMajorTitle
  );

  // 如果找到了对应的code
  if (selectedMajorCode) {
    const expectedTotal = expectedTotalQuestions.value;
    const isLast = currentQuestion.value === expectedTotal - 1;
    return isLast;
  }

  return false;
});

// ----------------------
// 3. Vue 状态
// ----------------------
const currentQuestion = ref(0);
const answers = reactive<any[]>([]);

// ----------------------
// 4. 动态生成问题
// ----------------------
const questions = reactive([...baseQuestions.value]);

// 监听语言变化，重新生成基础问题和关键词问题
watch(locale, () => {
  // 重新生成基础问题
  questions.splice(0, 2, ...baseQuestions.value);

  // 如果已经选择了工作领域，重新生成关键词问题
  if (answers[1]) {
    const mgCode = Object.keys(majorGroupKeywords).find((key) => {
      return mapMajorGroupCodeToTitle(key) === answers[1];
    });
    if (mgCode) {
      questions.splice(2);
      const randomQuestions = generateRandomKeywordQuestions(mgCode, 5);
      questions.push(...randomQuestions);
    }
  }
}, { immediate: true });

watch(
  () => answers[1],
  (newMajor) => {
    if (!newMajor) return;
    questions.splice(2);
    const mgCode = Object.keys(majorGroupKeywords).find((key) => {
      return mapMajorGroupCodeToTitle(key) === newMajor;
    });
    if (mgCode) {
      const randomQuestions = generateRandomKeywordQuestions(mgCode, 5);
      questions.push(...randomQuestions);
    }
  }
);

// 映射 major_group_code -> title (使用英文作为基准)
function mapMajorGroupCodeToTitle(code: string) {
  const map = {
    "1": "Managers",
    "2": "Professionals",
    "3": "Technicians and Associate Professionals",
    "4": "Clerical Support Workers",
    "5": "Service and Sales Workers",
    "6": "Skilled Agricultural, Forestry, Livestock and Fishery Workers",
    "7": "Craft and Related Trades Workers",
    "8": "Plant and Machine Operators and Assemblers",
    "9": "Elementary Occupations",
    "0": "Armed Forces"
  };
  return (map as any)[code];
}

// ----------------------
// 多语言辅助函数
// ----------------------
function getQuestionText(questionIndex: number) {
  if (questionIndex === 0) {
    return $t('quiz.questions.education');
  } else if (questionIndex === 1) {
    return $t('quiz.questions.jobArea');
  } else {
    return $t('quiz.questions.activities');
  }
}

function getOptionValue(option: any) {
  if (typeof option === 'object') {
    if (option.key) {
      // 工作领域用英文原值
      const keyToEnglishMap: Record<string, string> = {
        'managers': 'Managers',
        'professionals': 'Professionals',
        'technicians': 'Technicians and Associate Professionals',
        'clerical': 'Clerical Support Workers',
        'service': 'Service and Sales Workers',
        'agricultural': 'Skilled Agricultural, Forestry, Livestock and Fishery Workers',
        'craft': 'Craft and Related Trades Workers',
        'operators': 'Plant and Machine Operators and Assemblers',
        'elementary': 'Elementary Occupations',
        'armed': 'Armed Forces'
      };
      return keyToEnglishMap[option.key] || option.value;
    }

    // 教育选项：强制返回完整英文
    const originalEducationOptions = [
      "First Level (Primary education)",
      "Second Level (High school education)",
      "Third Level (Bachelor's degree or equivalent)",
      "Fourth Level (Master's/PhD or advanced education)"
    ];

    if (originalEducationOptions.includes(option.value)) {
      return option.value;
    }
  }

  return option;
}


function getOptionText(option: any) {
  if (typeof option === 'object' && option.key) {
    // 工作领域选项
    return $t(`quiz.jobAreas.${option.key}.title`);
  }

  // 检查是否是教育等级
  const originalEducationOptions = [
    "First Level (Primary education)",
    "Second Level (High school education)",
    "Third Level (Bachelor's degree or equivalent)",
    "Fourth Level (Master's/PhD or advanced education)"
  ];

  const index = originalEducationOptions.indexOf(option);
  if (index !== -1) {
    return $t(`quiz.educationLevels.${index}`);
  }

  if (typeof option === 'string') {
    return translateKeyword(option, locale.value);
  }

  return option;
}

function getOptionDescription(option: any) {
  if (typeof option === 'object' && option.key) {
    return $t(`quiz.jobAreas.${option.key}.description`);
  }
  return option.description || '';
}

function hasDescription(option: any) {
  if (typeof option === 'object') {
    return !!(option.description || option.key);
  }
  return false;
}

function getEducationText(education: string) {
  const shortToFullMap: Record<string, string> = {
    'First': "First Level (Primary education)",
    'Second': "Second Level (High school education)",
    'Third': "Third Level (Bachelor's degree or equivalent)",
    'Fourth': "Fourth Level (Master's/PhD or advanced education)"
  };

  // 如果传进来的是短形式，先映射到完整的
  const normalized = shortToFullMap[education] || education;

  const originalEducationOptions = [
    "First Level (Primary education)",
    "Second Level (High school education)",
    "Third Level (Bachelor's degree or equivalent)",
    "Fourth Level (Master's/PhD or advanced education)"
  ];

  const index = originalEducationOptions.indexOf(normalized);
  if (index !== -1) {
    return $t(`quiz.educationLevels.${index}`);
  }

  return normalized;
}


function getJobAreaText(jobArea: string) {
  // 找到对应的key
  const englishToKeyMap = {
    'Managers': 'managers',
    'Professionals': 'professionals',
    'Technicians and Associate Professionals': 'technicians',
    'Clerical Support Workers': 'clerical',
    'Service and Sales Workers': 'service',
    'Skilled Agricultural, Forestry, Livestock and Fishery Workers': 'agricultural',
    'Craft and Related Trades Workers': 'craft',
    'Plant and Machine Operators and Assemblers': 'operators',
    'Elementary Occupations': 'elementary',
    'Armed Forces': 'armed'
  };

  const key = (englishToKeyMap as any)[jobArea];
  if (key) {
    return $t(`quiz.jobAreas.${key}.title`);
  }
  return jobArea;
}

// ----------------------
// 6. 分数计算和推荐逻辑
// ----------------------
const allScores = ref<any[]>([]);

// 新增：提取用户选择的关键词
function extractUserSelectedKeywords() {
  const selectedKeywords = [];

  // 从第3题开始（前2题是基础信息）
  for (let i = 2; i < answers.length; i++) {
    if (answers[i]) {
      selectedKeywords.push(answers[i]);
    }
  }

  return selectedKeywords.map(k => k.trim().toLowerCase());
}

function computeScores() {
  const scores: any[] = [];

  const selectedMajorTitle = answers[1];
  const selectedMajorCode = Object.keys(majorGroupKeywords).find(code =>
    mapMajorGroupCodeToTitle(code) === selectedMajorTitle
  );
  const selectedSkillLevel = answers[0];

  // 获取用户选择的关键词
  const userSelectedKeywords = extractUserSelectedKeywords();

  unitData.forEach((unit) => {
    let score = 0;
    const details = {
      skillMatch: 0,
      majorMatch: 0,
      keywordMatch: 0,
      userChoiceMatch: 0
    };

    // 1. 教育等级匹配（权重: 20%）
    if (selectedSkillLevel === unit.skill_level) {
      details.skillMatch = 20;
      score += 20;
    }

    // 2. Major Group匹配（权重: 25%）
    if (selectedMajorTitle === unit.major_group_title) {
      details.majorMatch = 25;
      score += 25;
    }

    // 3. 预定义关键词匹配（权重: 30%）
    const unitKeywords = selectedMajorCode ? (majorGroupKeywords as any)[selectedMajorCode]?.keywords || [] : [];
    const text = (unit.unit_group_description + " " + unit.tasks_include).toLowerCase();

    let keywordMatches = 0;
    unitKeywords.forEach((keyword: any) => {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    });

    const keywordScore = unitKeywords.length > 0
      ? Math.min((keywordMatches / unitKeywords.length) * 30, 30)
      : 0;
    details.keywordMatch = keywordScore;
    score += keywordScore;

    // 4. 用户选择关键词匹配（权重: 25%）
    let userChoiceMatches = 0;
    userSelectedKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        userChoiceMatches++;
      }
    });

    const userChoiceScore = userSelectedKeywords.length > 0
      ? Math.min((userChoiceMatches / userSelectedKeywords.length) * 25, 25)
      : 0;
    details.userChoiceMatch = userChoiceScore;
    score += userChoiceScore;

    scores.push({
      unit_group_code: unit.unit_group_code,
      score: Math.round(score),
      unit_title: unit.unit_group_title,
      major_group: unit.major_group_title,
      major_group_code: unit.major_group_code,
      skill_level: unit.skill_level,
      details: details,
      unit_data: unit
    });
  });

  // 按分数降序排序
  return scores.sort((a, b) => b.score - a.score);
}

// 改进的匹配原因生成函数 - 使用多语言
function generateDetailedMatchReason(item: any) {
  const reasons = [];
  const details = item.details;
  const userKeywords = extractUserSelectedKeywords();

  // 教育匹配
  if (details.skillMatch > 15) {
    reasons.push(`<div class="reason-item education">
      <span class="reason-icon">🎓</span>
      <span class="reason-text"><strong>${$t('quiz.results.matchReasons.educationMatch', { level: getEducationText(answers[0]) })}</strong></span>
    </div>`);
  } else {
    reasons.push(`<div class="reason-item education-partial">
      <span class="reason-icon">📚</span>
      <span class="reason-text"><strong>${$t('quiz.results.matchReasons.educationNote', { required: getEducationText(answers[0])})}</strong></span>
    </div>`);
  }

  // 专业领域匹配
  if (details.majorMatch > 20) {
    reasons.push(`<div class="reason-item field">
      <span class="reason-icon">💼</span>
      <span class="reason-text"><strong>${$t('quiz.results.matchReasons.fieldMatch', { field: getJobAreaText(answers[1]) })}</strong></span>
    </div>`);
  }

  // 技能关键词匹配
  if (details.keywordMatch > 20) {
    reasons.push(`<div class="reason-item skills">
      <span class="reason-icon">⚡</span>
      <span class="reason-text"><strong>${$t('quiz.results.matchReasons.skillsMatch', { group: getJobAreaText(answers[1]) })}</strong></span>
    </div>`);
  }

  // 个人兴趣匹配
  if (details.userChoiceMatch > 15) {
  const matchedCount = Math.round((details.userChoiceMatch / 25) * userKeywords.length);

  const translatedKeywords = userKeywords.slice(0, 3).map(keyword =>
    translateKeyword(keyword, locale.value)
  );
  const displayKeywords = translatedKeywords.join(', ') + (userKeywords.length > 3 ? '...' : '');

  reasons.push(`<div class="reason-item interests">
    <span class="reason-icon">❤️</span>
    <span class="reason-text"><strong>${$t('quiz.results.matchReasons.interestMatch', { count: matchedCount, interests: displayKeywords })}</strong></span>
  </div>`);
  }

  // 职业前景信息
  const score = item.score;
  let prospectText = "";
  if (score >= 80) {
    prospectText = $t('quiz.results.matchReasons.excellent');
  } else if (score >= 60) {
    prospectText = $t('quiz.results.matchReasons.strong');
  } else if (score >= 40) {
    prospectText = $t('quiz.results.matchReasons.suitable');
  } else {
    prospectText = $t('quiz.results.matchReasons.development');
  }

  reasons.push(`<div class="reason-item prospect">
    <span class="reason-icon">🚀</span>
    <span class="reason-text"><strong>${$t('quiz.results.matchReasons.careerOutlook')} ${prospectText}</strong></span>
  </div>`);

  return reasons.join('');
}

const recommendedUnits = computed(() => {
  if (currentQuestion.value < expectedTotalQuestions.value) return [];

  // 计算分数并存储
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  allScores.value = computeScores();

  if (allScores.value.length === 0) {
    return [{
      unit_group_code: "No matching careers found",
      unit_group_title: "No matching careers found",
      score: 0,
      detailedReason: ""
    }];
  }

  // 返回前5个推荐职业，包含详细信息
  const results = allScores.value.slice(0, 5).map(item => ({
    unit_group_code: item.unit_group_code,
    unit_group_title: item.unit_title,
    score: item.score,
    detailedReason: generateDetailedMatchReason(item),
    details: item.details,
    major_group_code: item.major_group_code,
    major_group_title: item.major_group
  }));

  // Auto-save quiz results when computed (no user action required)
  nextTick(() => {
    saveQuizResults();
  });

  return results;
});

// 在 setup 函数中
const router = useRouter()

function goToJob(unit: any) {
  const fullUnitInfo = unitData.find(u => u.unit_group_code === unit.unit_group_code);

  if (!fullUnitInfo) {
    console.error('在unitData中找不到职业信息:', unit.unit_group_code);
    return;
  }

  const industrySlug = fullUnitInfo.major_group_title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9-]/g, '');

  // Store quiz results and answers for restoration later
  saveQuizResults();

  // Navigate to job description with fromQuiz flag
  router.push(
    {
      name: 'job-description',
      params: {industry: industrySlug, jobId: unit.unit_group_code},
      query: {
        unitGroupCode: unit.unit_group_code,
        fromQuiz: 'true'
      }
    }
  )

  emit('quiz-completed')
}

// Function to save quiz results to sessionStorage
function saveQuizResults() {
  const quizState = {
    results: recommendedUnits.value,
    answers: [...answers],
    currentQuestion: currentQuestion.value,
    timestamp: Date.now()
  };
  sessionStorage.setItem('jobQuizResults', JSON.stringify(quizState));
}

// ----------------------
// 7. 导航函数
// ----------------------
function nextQuestion() {
  if (currentQuestion.value < expectedTotalQuestions.value - 1) {
    currentQuestion.value++;
  } else if (isLastQuestion.value) {
    // 如果是最后一个问题，点击后跳转到结果页面
    currentQuestion.value++;
  }
}

function prevQuestion() {
  if (currentQuestion.value > 0) {
    currentQuestion.value--;
  }
}

function restart() {
  currentQuestion.value = 0;
  answers.length = 0;
  // 清空描述展开状态
  Object.keys(expandedDescriptions).forEach(key => {
    delete expandedDescriptions[key];
  });
  // Clear saved quiz results from sessionStorage
  sessionStorage.removeItem('jobQuizResults');
}

function finishQuiz() {
  // Save quiz results before closing
  saveQuizResults()
  emit('quiz-completed')
}

// Function to restore quiz results from sessionStorage
function restoreQuizResults() {
  const stored = sessionStorage.getItem('jobQuizResults');
  if (stored) {
    try {
      const quizState = JSON.parse(stored);
      // Check if results are not too old (within 15 minutes)
      if (Date.now() - quizState.timestamp < 900000) {
        // Restore answers
        answers.length = 0;
        answers.push(...quizState.answers);

        // Force rebuild questions array based on restored answers
        if (answers[1]) {
          const mgCode = Object.keys(majorGroupKeywords).find((key) => {
            return mapMajorGroupCodeToTitle(key) === answers[1];
          });
          if (mgCode) {
            questions.splice(2);
            const randomQuestions = generateRandomKeywordQuestions(mgCode, 5);
            questions.push(...randomQuestions);
          }
        }

        // Use nextTick to ensure questions array is updated before setting current question
        nextTick(() => {
          // Set current question to show results (beyond last question)
          currentQuestion.value = expectedTotalQuestions.value;
        });

        return true;
      }
    } catch (error) {
      console.error('Error restoring quiz results:', error);
    }
  }
  return false;
}

// Expose restoreQuizResults for external use
defineExpose({
  restoreQuizResults
})
</script>

<style scoped>
.questionnaire {
  max-width: 100%;
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
}

/* 标题样式 */
.questionnaire h2 {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  text-align: center;
  background: linear-gradient(135deg, #C65A0F, #ea580c);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 4px rgba(198, 90, 15, 0.1);
}

/* Progress Bar Styles */
.progress-container {
  margin-bottom: 2rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(198, 90, 15, 0.1);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.progress-text {
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  font-weight: 600;
  color: #1f2937;
}

.remaining-text {
  font-size: clamp(0.8rem, 1vw, 0.9rem);
  color: #6b7280;
  font-style: italic;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #C65A0F, #ea580c);
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.questionnaire h3 {
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-weight: 600;
  color: #059669;
  margin-bottom: 1.5rem;
  text-align: center;
  position: relative;
}

.questionnaire h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #059669, #10b981);
  border-radius: 2px;
}

/* 问题文本样式 */
.questionnaire p {
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  font-weight: 500;
  color: #374151;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 12px;
  border-left: 4px solid #C65A0F;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.questionnaire p::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(198, 90, 15, 0.1), transparent);
  border-radius: 50%;
}

/* 新增：选项容器样式 */
.option-container {
  margin-bottom: 12px;
}

.option-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

/* 选项标签样式 */
.questionnaire label {
  display: flex;
  align-items: center;
  padding: clamp(12px, 2vw, 16px);
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  flex: 1;
}

.questionnaire label::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(198, 90, 15, 0.1), transparent);
  transition: left 0.5s ease;
}

.questionnaire label:hover::before {
  left: 100%;
}

.questionnaire label:hover {
  background: linear-gradient(135deg, #fef3e2, #fdf2e9);
  border-color: rgba(198, 90, 15, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(198, 90, 15, 0.15);
}

.questionnaire input[type="radio"] {
  margin-right: 12px;
  scale: 1.3;
  accent-color: #C65A0F;
  position: relative;
}

.questionnaire input[type="radio"]:checked + * {
  color: #C65A0F;
  font-weight: 600;
}

.questionnaire label:has(input[type="radio"]:checked) {
  background: linear-gradient(135deg, #fef3e2, #fed7aa);
  border: 2px solid #C65A0F;
  box-shadow: 0 8px 25px rgba(198, 90, 15, 0.25);
  transform: translateY(-1px);
}

.questionnaire label:has(input[type="radio"]:checked)::after {
  content: '✓';
  position: absolute;
  right: 16px;
  color: #C65A0F;
  font-weight: bold;
  font-size: 1.2rem;
}

/* 新增：描述面板样式 */
.description-panel {
  margin-top: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef3e2, #fdf2e9);
  border-left: 3px solid #C65A0F;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.5;
  animation: slideDown 0.3s ease-out;
  box-shadow: 0 2px 8px rgba(198, 90, 15, 0.1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  to {
    opacity: 1;
    max-height: 200px;
    padding-top: 12px;
    padding-bottom: 12px;
  }
}

/* 修改的信息图标样式 */
.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #C65A0F;
  color: white;
  border-radius: 50%;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  user-select: none;
  flex-shrink: 0;
}

.info-icon:hover {
  background: #ea580c;
  transform: scale(1.1);
}

.info-icon:active {
  transform: scale(0.95);
}

/* 选项容器 */
.questionnaire > div:first-child > div:not(.buttons) {
  display: grid;
  gap: 8px;
  margin: 1.5rem 0;
}

/* 按钮容器 */
.buttons {
  margin-top: 2rem;
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 1rem 0;
}

/* 按钮基础样式 */
button {
  padding: clamp(10px, 2vw, 14px) clamp(20px, 4vw, 28px);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 120px;
  position: relative;
  overflow: hidden;
  text-transform: capitalize;
  letter-spacing: 0.5px;
}

button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
}

button:hover::before {
  width: 300px;
  height: 300px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

button:not(:disabled):hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

button:not(:disabled):active {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* 默认按钮样式 */
button:not(.submit-button):not(.close-button) {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
}

button:not(.submit-button):not(.close-button):hover:not(:disabled) {
  background: linear-gradient(135deg, #4b5563, #374151);
}

/* 提交按钮样式 */
.submit-button {
  background: linear-gradient(135deg, #C65A0F, #ea580c);
  color: white;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(198, 90, 15, 0.3);
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #ea580c, #dc2626);
  box-shadow: 0 8px 25px rgba(198, 90, 15, 0.4);
}

/* 关闭按钮样式 */
.close-button {
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  margin-left: 0;
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
}

.close-button:hover {
  background: linear-gradient(135deg, #047857, #065f46);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.4);
}

/* 新增：结果总结样式 */
.results-summary {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 2px solid #0ea5e9;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.analysis-details h4 {
  margin: 1rem 0 0.5rem 0;
  color: #0f172a;
  font-size: 1.1rem;
}

.profile-tags {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.tag {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.education-tag {
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
}

.field-tag {
  background: linear-gradient(135deg, #059669, #047857);
}

.keywords-tag {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
}

/* 结果页面样式 */
.recommendation-list {
  list-style-type: none;
  padding: 0;
  margin: 2rem 0;
  display: grid;
  gap: 20px;
}

.recommendation-item {
  background: linear-gradient(135deg, #ffffff, #f8fafc) !important;
  padding: clamp(16px, 3vw, 24px) !important;
  margin: 0 !important;
  border-radius: 16px !important;
  border-left: 4px solid #C65A0F;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
  font-family: inherit !important;
  font-size: 1em !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.recommendation-item::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(198, 90, 15, 0.05), transparent);
  border-radius: 50%;
}

.recommendation-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15) !important;
  border-left-width: 6px;
}

.rank-title {
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  margin-bottom: 12px;
  color: #1f2937;
  font-weight: 700;
}

.match-info {
  margin-bottom: 16px;
}

.match-score {
  color: #059669;
  font-weight: bold;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: clamp(0.85rem, 1.1vw, 0.95rem);
  border: 1px solid rgba(16, 185, 129, 0.3);
  display: inline-block;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
}

/* 新增：详细原因样式 */
.detailed-match-reason {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.detailed-match-reason h5 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.reason-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 0;
}

.reason-item:last-child {
  margin-bottom: 0;
}

.reason-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.reason-text {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #4b5563;
}

.education {
  background: rgba(139, 69, 19, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.education-partial {
  background: rgba(245, 158, 11, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.field {
  background: rgba(5, 150, 105, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.skills {
  background: rgba(168, 85, 247, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.interests {
  background: rgba(239, 68, 68, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.prospect {
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  padding: 8px;
}

/* 无结果样式 */
.questionnaire > div:last-child > div:first-child p {
  text-align: center;
  color: #6b7280;
  font-size: clamp(1rem, 1.3vw, 1.1rem);
  padding: 2rem;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border-radius: 12px;
  border: 2px dashed #d1d5db;
}

.result-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  gap: 16px;
  flex-wrap: wrap;
}

.clickable-title {
  cursor: pointer;
  color: #007bff;
}

.clickable-title:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .questionnaire {
    padding: 0 1rem;
  }

  .progress-container {
    padding: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .progress-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .progress-text {
    font-weight: 700;
  }

  .remaining-text {
    font-size: 0.8rem;
  }

  .progress-bar {
    height: 10px;
  }

  .buttons {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  button {
    width: 100%;
    max-width: 280px;
  }

  .recommendation-item {
    padding: 16px !important;
  }

  .questionnaire > div:first-child > div:not(.buttons) {
    gap: 6px;
  }

  .profile-tags {
    flex-direction: column;
    align-items: center;
  }

  .tag {
    text-align: center;
  }

  .result-buttons {
    flex-direction: column;
    gap: 12px;
  }

  .result-buttons button {
    width: 100%;
    max-width: 280px;
  }
}

@media (max-width: 480px) {
  .questionnaire h2 {
    margin-bottom: 1.5rem;
  }

  .questionnaire p {
    padding: 0.8rem;
    margin-bottom: 1rem;
  }

  .buttons {
    padding: 0.8rem 0;
  }

  .results-summary {
    padding: 1.5rem;
  }
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.questionnaire > div {
  animation: slideIn 0.4s ease-out;
}

/* 焦点样式 */
button:focus-visible,
input[type="radio"]:focus-visible {
  outline: 2px solid #C65A0F;
  outline-offset: 2px;
}
</style>
