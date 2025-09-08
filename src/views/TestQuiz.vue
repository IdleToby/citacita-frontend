<template>
  <div class="questionnaire">
    <h2>Job Suggestion Quiz</h2>

    <!-- Progress Bar -->
    <div v-if="currentQuestion < questions.length" class="progress-container">
      <div class="progress-info">
        <span class="progress-text">Question {{ currentQuestion + 1 }} of {{ expectedTotalQuestions }}</span>
        <span class="remaining-text">{{ expectedTotalQuestions - currentQuestion - 1 }} questions remaining</span>
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
      <p>{{ questions[currentQuestion].question }}</p>
      <div v-for="(option, idx) in questions[currentQuestion].options" :key="idx">
        <label class="option-with-tooltip">
          <input
            type="radio"
            :name="'q' + currentQuestion"
            :value="typeof option === 'object' ? option.value : option"
            v-model="answers[currentQuestion]"
          />
          <span class="option-text">
            {{ typeof option === 'object' ? option.value : option }}
          </span>
          <span
            v-if="typeof option === 'object' && option.description"
            class="info-icon"
            :title="option.description"
          >
            ?
          </span>
        </label>
      </div>

      <div class="buttons">
        <button @click="prevQuestion" :disabled="currentQuestion === 0">Previous</button>
        <!-- 最后一个问题显示Submit -->
        <button
          @click="nextQuestion"
          :disabled="!answers[currentQuestion]"
          :class="{ 'submit-button': isLastQuestion }"
        >
          {{ isLastQuestion ? 'Submit' : 'Next' }}
        </button>
      </div>
    </div>

    <!-- 结果显示 -->
    <div v-else>
      <h3>Recommended Unit Groups</h3>

      <div v-if="recommendedUnits[0]?.unit_group_code === 'No matching results'">
        <p>No matching careers found. Please try different options.</p>
      </div>

      <div v-else>
        <p>Based on your answers, we recommend these careers:</p>
        <ul class="recommendation-list">

          <li v-for="(unit, index) in recommendedUnits" :key="unit.unit_group_code"
              class="recommendation-item">
            <div class="rank-title">
              <strong class="clickable-title" @click="goToJob(unit)">#{{ index + 1 }}:
                {{ unit.unit_group_code }} - {{ unit.unit_group_title }}</strong>
            </div>
            <div class="match-info">
              <span class="match-score">Matching Percentage: {{ unit.score }}%</span>
            </div>
            <div class="match-reason">
              <span>Matching reason: {{ unit.matchReason }}</span>
            </div>
          </li>
        </ul>
      </div>
      <div class="result-buttons">
        <button @click="restart">Restart Questionnaire</button>
        <button @click="finishQuiz" class="close-button">
          Close Quiz
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch, nextTick} from "vue";
// ----------------------
// 5. 模拟数据
// ----------------------
import unitData from "@/data/unit_group_data.json";
import majorGroupKeywords from "@/data/major_group_keywords.json";
import {useRouter} from 'vue-router'

const emit = defineEmits(['quiz-completed'])

// ----------------------
// 1. 基础问卷问题
// ----------------------
const baseQuestions = [
  {
    question: "What is your highest education level?",
    type: "single_choice",
    options: ["First Level (Primary education)", "Second Level (High school education)", "Third Level (Bachelor's degree or equivalent)", "Fourth Level (Master's/PhD or advanced education)"],
    key: "skill_level"
  },
  {
    question: "Which general job area are you interested in?",
    type: "single_choice",
    options: [
      {
        value: "Managers",
        description: "Plan, lead, and coordinate the policies and activities of organizations, departments, or enterprises."
      },
      {
        value: "Professionals",
        description: "Apply scientific or artistic knowledge, conduct research, or teach specialized subjects."
      },
      {
        value: "Technicians and Associate Professionals",
        description: "Perform technical tasks supporting research, science, arts, regulations, or operations."
      },
      {
        value: "Clerical Support Workers",
        description: "Manage records, organize information, and handle administrative and clerical tasks."
      },
      {
        value: "Service and Sales Workers",
        description: "Provide personal services, protection, or sell goods in shops, markets, or similar settings."
      },
      {
        value: "Skilled Agricultural, Forestry, Livestock and Fishery Workers",
        description: "Grow crops, manage forests, raise animals, and harvest or catch fish and aquatic resources."
      },
      {
        value: "Craft and Related Trades Workers",
        description: "Construct, repair, and produce goods using tools, machinery, and specialized techniques."
      },
      {
        value: "Plant and Machine Operators and Assemblers",
        description: "Operate and monitor machinery, vehicles, or industrial equipment; assemble products."
      },
      {
        value: "Elementary Occupations",
        description: "Carry out simple, routine, or physically demanding tasks using basic tools or machines."
      },
      {
        value: "Armed Forces",
        description: "Serve in the military to defend the nation, maintain order, support relief efforts, and participate in peacekeeping operations."
      }
    ],
    key: "major_group"
  }
];


// ----------------------
// 2. 每个 Major Group 的 5 道问题
// key 为 major group code (与 baseQuestions 第二题对应)
// ----------------------
const majorGroupQuestions = {
  "1": [
    {
      "question": "Which activity appeals to you most in a managerial context?",
      "options": ["planning / tasks", "managing / related", "monitoring / directing", "operations / workers"]
    },
    {
      "question": "Which managerial task would you like to perform?",
      "options": ["managers / services", "performing / organisation", "policies / scheduling", "activities / procedures"]
    },
    {
      "question": "Which of these management responsibilities do you prefer?",
      "options": ["overseeing / plan", "ensuring / controlling", "directing / operations", "workers / services"]
    },
    {
      "question": "Which management activity interests you the most?",
      "options": ["activities / scheduling", "tasks / monitoring", "planning / directing", "organisation / policies"]
    },
    {
      "question": "Which aspect of managerial work is appealing?",
      "options": ["performing / tasks", "managing / operations", "workers / ensuring", "services / monitoring"]
    }
  ],
  "2": [
    {
      "question": "Which professional activity interests you?",
      "options": ["work / related", "performing / knowledge", "coordinating / performance", "tasks / preparing"]
    },
    {
      "question": "Which professional task appeals to you?",
      "options": ["enhancing / research", "systems / development", "conducting / planning", "advising / health"]
    },
    {
      "question": "Which of these professional responsibilities do you prefer?",
      "options": ["reports / information", "developing / methods", "planning / knowledge", "tasks / coordinating"]
    },
    {
      "question": "Which professional activity would you like to perform?",
      "options": ["preparing / development", "research / systems", "advising / performance", "enhancing / work"]
    },
    {
      "question": "Which professional task is most appealing?",
      "options": ["work / tasks", "knowledge / development", "coordination / planning", "information / conducting"]
    }
  ],
  "3": [
    {
      "question": "Which technician task interests you?",
      "options": ["tasks / monitoring", "related / performing", "equipment / workers", "supervising / scheduling"]
    },
    {
      "question": "Which technical activity do you prefer?",
      "options": ["work / assisting", "technical / preparing", "medical / materials", "operating / health"]
    },
    {
      "question": "Which technician responsibility appeals to you?",
      "options": ["preparing / systems", "scheduling / technical", "monitoring / equipment", "assisting / performing"]
    },
    {
      "question": "Which technical task is most interesting?",
      "options": ["workers / operating", "tasks / materials", "technical / research", "health / systems"]
    },
    {
      "question": "Which aspect of technical work do you like?",
      "options": ["supervising / preparing", "assisting / tasks", "equipment / monitoring", "operating / technical"]
    }
  ],
  "4": [
    {
      "question": "Which clerical task appeals to you?",
      "options": ["tasks / related", "information / workers", "performing / supervising", "scheduling / records"]
    },
    {
      "question": "Which clerical activity would you prefer?",
      "options": ["monitoring / clients", "preparing / clerks", "documents / telephone", "data / services"]
    },
    {
      "question": "Which aspect of clerical work interests you?",
      "options": ["receiving / recording", "reports / mail", "supervising / tasks", "workers / information"]
    },
    {
      "question": "Which clerical task would you choose?",
      "options": ["preparing / documents", "monitoring / records", "clients / data", "scheduling / services"]
    },
    {
      "question": "Which clerical responsibility appeals to you most?",
      "options": ["tasks / clerks", "information / monitoring", "performing / records", "data / clients"]
    }
  ],
  "5": [
    {
      "question": "Which service/sales task interests you?",
      "options": ["performing / tasks", "related / workers", "goods / supervising", "customers / food"]
    },
    {
      "question": "Which service activity appeals to you?",
      "options": ["services / care", "taking / cleaning", "preparing / assisting", "sales / items"]
    },
    {
      "question": "Which aspect of service work do you like?",
      "options": ["ensuring / vehicles", "giving / personal", "tasks / goods", "workers / performing"]
    },
    {
      "question": "Which service/sales task would you choose?",
      "options": ["performing / tasks", "related / cleaning", "goods / assisting", "customers / services"]
    },
    {
      "question": "Which service activity is most appealing?",
      "options": ["preparing / workers", "sales / items", "care / services", "taking / tasks"]
    }
  ],
  "6": [
    {
      "question": "Which agricultural task interests you?",
      "options": ["products / marketing", "performing / livestock", "related / crops", "sale / operations"]
    },
    {
      "question": "Which farming activity appeals to you?",
      "options": ["tasks / markets", "determining / maintaining", "animals / delivery", "farm / regular"]
    },
    {
      "question": "Which agricultural responsibility do you prefer?",
      "options": ["organisations / purchasing", "supplies / delivery", "performing / crops", "related / farm"]
    },
    {
      "question": "Which farm-related task interests you?",
      "options": ["tasks / livestock", "maintaining / products", "marketing / delivery", "operations / crops"]
    },
    {
      "question": "Which aspect of agricultural work appeals to you?",
      "options": ["farm / animals", "sale / tasks", "determining / supplies", "regular / markets"]
    }
  ],
  "7": [
    {
      "question": "Which craft/trade task interests you?",
      "options": ["related / performing", "tasks / repairing", "making / equipment", "metal / repair"]
    },
    {
      "question": "Which craft activity appeals to you?",
      "options": ["materials / using", "buildings / installing", "parts / articles", "cutting / workers"]
    },
    {
      "question": "Which aspect of craft work do you like?",
      "options": ["machines / structures", "make / related", "performing / tasks", "repair / equipment"]
    },
    {
      "question": "Which craft task would you choose?",
      "options": ["installing / buildings", "materials / cutting", "articles / workers", "metal / tasks"]
    },
    {
      "question": "Which craft responsibility interests you?",
      "options": ["making / performing", "repairing / tasks", "equipment / related", "using / structures"]
    }
  ],
  "8": [
    {
      "question": "Which plant/machine operator task appeals to you?",
      "options": ["operating / machines", "monitoring / equipment", "products / related", "performing / tasks"]
    },
    {
      "question": "Which machine operation activity interests you?",
      "options": ["operators / operate", "machine / materials", "machinery / paper", "monitor / metal"]
    },
    {
      "question": "Which operator task do you prefer?",
      "options": ["plant / make", "used / equipment", "tasks / performing", "machines / monitoring"]
    },
    {
      "question": "Which aspect of machinery work appeals to you?",
      "options": ["products / related", "operators / machine", "materials / operate", "monitor / plant"]
    },
    {
      "question": "Which plant/machine operator task would you choose?",
      "options": ["machines / performing", "equipment / tasks", "monitoring / operators", "materials / machinery"]
    }
  ],
  "9": [
    {
      "question": "Which elementary occupation task interests you?",
      "options": ["tasks / related", "cleaning / performing", "goods / collecting", "various / washing"]
    },
    {
      "question": "Which basic work activity appeals to you?",
      "options": ["labourers / work", "food / clean", "perform / materials", "simple / items"]
    },
    {
      "question": "Which elementary task would you choose?",
      "options": ["hand / loading", "unloading / carrying", "tasks / performing", "goods / clean"]
    },
    {
      "question": "Which basic work responsibility interests you?",
      "options": ["various / labourers", "food / items", "clean / perform", "materials / tasks"]
    },
    {
      "question": "Which elementary activity appeals to you most?",
      "options": ["tasks / related", "cleaning / goods", "performing / work", "collecting / items"]
    }
  ],
  "0": [
    {
      "question": "Which armed forces task appeals to you?",
      "options": ["personnel / support", "officers / ensuring", "planning / public", "combat / order"]
    },
    {
      "question": "Which defense activity interests you?",
      "options": ["training / knowledge", "group / assets", "duty / defence", "threats / deployed"]
    },
    {
      "question": "Which armed forces responsibility would you choose?",
      "options": ["assisting / helping", "provides / groups", "planning / training", "knowledge / duty"]
    },
    {
      "question": "Which defense task appeals to you most?",
      "options": ["public / combat", "order / training", "knowledge / group", "assets / deployed"]
    },
    {
      "question": "Which armed forces activity interests you?",
      "options": ["personnel / support", "planning / order", "officers / duty", "combat / threats"]
    }
  ]
};

// ----------------------
// 3. Vue 状态
// ----------------------
const currentQuestion = ref(0);
const answers = reactive<any[]>([]);

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
  const selectedMajorCode = Object.keys(majorGroupQuestions).find(code =>
    mapMajorGroupCodeToTitle(code) === selectedMajorTitle
  );

  // 如果找到了对应的code并且有对应的问题，计算总数
  if (selectedMajorCode && (majorGroupQuestions as any)[selectedMajorCode]) {
    const expectedTotal = expectedTotalQuestions.value;
    const isLast = currentQuestion.value === expectedTotal - 1;

    return isLast;
  }

  return false;
});

// ----------------------
// 4. 动态生成问题
// ----------------------
const questions = reactive([...baseQuestions]);

watch(
  () => answers[1],
  (newMajor) => {
    if (!newMajor) return;
    questions.splice(2);
    const mgCode = Object.keys(majorGroupQuestions).find((key) => {
      return mapMajorGroupCodeToTitle(key) === newMajor;
    });
    if (mgCode && (majorGroupQuestions as any)[mgCode]) {
      questions.push(...(majorGroupQuestions as any)[mgCode]);
    }
  }
);

// 映射 major_group_code -> title
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
// 6. 分数计算和推荐逻辑
// ----------------------
const allScores = ref<any[]>([]);

// 新增：提取用户选择的关键词
function extractUserSelectedKeywords() {
  const selectedKeywords = [];

  // 从第3题开始（前2题是基础信息）
  for (let i = 2; i < answers.length; i++) {
    if (answers[i]) {
      // 将用户选择的选项按 " / " 分割，提取关键词
      const keywords = answers[i].split(' / ');
      selectedKeywords.push(...keywords);
    }
  }

  return selectedKeywords.map(k => k.trim().toLowerCase());
}

function computeScores() {
  const scores: any[] = [];

  const selectedMajorTitle = answers[1];
  const selectedMajorCode = Object.keys(majorGroupQuestions).find(code =>
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
      userChoiceMatch: 0 // 新增：用户选择匹配
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

    // 4. 新增：用户选择关键词匹配（权重: 25%）
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
    });
  });

  // 按分数降序排序
  return scores.sort((a, b) => b.score - a.score);
}

// 新增：生成匹配原因说明
function generateMatchReason(item: any) {
  const reasons = [];
  if (item.details?.skillMatch > 15) reasons.push("Educational Matching");
  if (item.details?.majorMatch > 20) reasons.push("Professional field matching");
  if (item.details?.keywordMatch > 20) reasons.push("Skill keyword matching");
  if (item.details?.userChoiceMatch > 15) reasons.push("Personal choice preference matching");

  return reasons.join(" + ") || "Basic Matching";
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
      matchReason: ""
    }];
  }

  // 返回前5个推荐职业，包含详细信息
  return allScores.value.slice(0, 5).map(item => ({
    unit_group_code: item.unit_group_code,
    unit_group_title: item.unit_title,
    score: item.score,
    matchReason: generateMatchReason(item),
    details: item.details
  }));
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
  const quizState = {
    results: recommendedUnits.value,
    answers: [...answers],
    currentQuestion: currentQuestion.value,
    timestamp: Date.now()
  };
  sessionStorage.setItem('jobQuizResults', JSON.stringify(quizState));

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
}

function finishQuiz() {
  emit('quiz-completed')
}

// Function to restore quiz results from sessionStorage
function restoreQuizResults() {
  const stored = sessionStorage.getItem('jobQuizResults');
  if (stored) {
    try {
      const quizState = JSON.parse(stored);
      // Check if results are not too old (within 2 hours)
      if (Date.now() - quizState.timestamp < 7200000) {
        // Restore answers
        answers.length = 0;
        answers.push(...quizState.answers);

        // Force rebuild questions array based on restored answers
        if (answers[1]) {
          const mgCode = Object.keys(majorGroupQuestions).find((key) => {
            return mapMajorGroupCodeToTitle(key) === answers[1];
          });
          if (mgCode && (majorGroupQuestions as any)[mgCode]) {
            questions.splice(2);
            questions.push(...(majorGroupQuestions as any)[mgCode]);
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

/* 选项容器 */
.questionnaire > div:first-child > div:not(.buttons) {
  display: grid;
  gap: 12px;
  margin: 1.5rem 0;
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
  margin-bottom: 10px;
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

.match-reason {
  color: #6b7280;
  font-size: clamp(0.85rem, 1.1vw, 0.95rem);
  font-style: italic;
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(107, 114, 128, 0.05);
  border-radius: 6px;
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
    gap: 8px;
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

/* 在testquiz.vue的<style scoped>中添加 */
.result-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  gap: 16px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .result-buttons {
    flex-direction: column;
    gap: 12px;
  }

  .result-buttons button {
    width: 100%;
    max-width: 280px;
  }
}

.clickable-title {
  cursor: pointer;
  color: #007bff;
}

.clickable-title:hover {
  text-decoration: underline;
}


/* 问号图标 - 绝对定位，不影响布局 */
.info-icon {
  position: absolute;
  right: 12px; /* 固定在右边 */
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #C65A0F;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  cursor: help;
  transition: all 0.3s ease;
  z-index: 2;
}

.info-icon:hover {
  background: #ea580c;
  transform: translateY(-50%) scale(1.1);
}

/* Tooltip */
.info-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; /* 从18px增加到24px */
  height: 24px; /* 从18px增加到24px */
  background: #C65A0F;
  color: white;
  border-radius: 50%;
  font-size: 16px; /* 从12px增加到16px */
  font-weight: bold;
  cursor: help;
  transition: all 0.1s ease;
  z-index: 2;
}

/* 箭头指向问号 */
.info-icon[title]:hover::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: rgba(0, 0, 0, 0.92);
  z-index: 1000;
}

/* 为有描述的选项预留右侧空间 */
.questionnaire label:has(.info-icon) {
  padding-right: 55px;
}

.questionnaire label:has(.info-icon) .option-text {
  margin-right: 35px;
}
</style>
