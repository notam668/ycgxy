// ===== 核心匹配算法（基于2025年分数线）=====

// 根据用户分数计算报考概率（基于2025年专业最低分）
// 返回: probability (0-100), category (chong/wen/bao), diff (分数差)
function calculateProbability(userScore, major) {
  // 2025年专业最低分作为核心参考
  const line2025 = major.minScore;
  const avg = major.avgScore;

  // 分数差 = 用户分数 - 2025年最低分
  const diff = userScore - line2025;

  let probability, category;

  // === 基于2025年最低分的概率算法 ===
  // 参考逻辑：2025年该专业的最低录取分为 line2025
  // 如果2026年考生分数 >= 此分数，则有较大录取概率

  if (userScore >= line2025 + 12) {
    // 高于2025最低分12分以上，极大概率（保底类）
    probability = 85 + Math.min(14, (userScore - line2025 - 12) * 0.8);
    category = 'bao';
  } else if (userScore >= line2025 + 5) {
    // 高于2025最低分5-11分，大概率（稳妥类）
    const ratio = (userScore - line2025 - 5) / 7;
    probability = 70 + ratio * 15;
    category = 'wen';
  } else if (userScore >= line2025) {
    // 刚好达到或略高于2025最低分0-4分，中等概率（稳妥偏冲刺）
    const ratio = (userScore - line2025) / 5;
    probability = 55 + ratio * 15;
    category = 'wen';
  } else if (userScore >= line2025 - 5) {
    // 低于2025最低分5分以内，有一定希望（冲刺类，分数线可能下降）
    const ratio = (line2025 - userScore) / 5;
    probability = 30 + (1 - ratio) * 25;
    category = 'chong';
  } else if (userScore >= line2025 - 12) {
    // 低于2025最低分6-12分，较小概率（冲刺类）
    const ratio = (line2025 - userScore - 5) / 7;
    probability = Math.max(10, 30 - ratio * 20);
    category = 'chong';
  } else if (userScore >= line2025 - 25) {
    // 低于2025最低分13-25分，极小概率（仅供冲刺）
    probability = Math.max(3, 10 - (line2025 - userScore - 12) * 0.5);
    category = 'chong';
  } else {
    // 分数差距太大
    probability = Math.max(1, 3 - (line2025 - userScore - 25) * 0.1);
    category = 'chong';
  }

  // 考虑专业热度微调（热门专业竞争更激烈）
  if (major.hotLevel === 5) probability *= 0.94;
  else if (major.hotLevel === 4) probability *= 0.97;

  // 中外合作办学专业分数波动较大，微调
  if (major.tags && major.tags.some(t => t.includes('中外合作'))) {
    probability *= 1.02;
  }

  return {
    probability: Math.round(Math.min(99, Math.max(1, probability))),
    category,
    diff
  };
}

// 获取分类中文信息
function getCategoryInfo(category) {
  const map = {
    chong: {
      name: '冲刺',
      icon: '🚀',
      color: '#ff6b6b',
      bgColor: '#fff5f5',
      tip: '分数略低于该专业录取线，可作为志愿填报的冲一冲选择'
    },
    wen: {
      name: '稳妥',
      icon: '⚖️',
      color: '#ffa726',
      bgColor: '#fff8e1',
      tip: '分数与该专业录取线匹配度高，录取概率较大，稳妥选择'
    },
    bao: {
      name: '保底',
      icon: '🛡️',
      color: '#66bb6a',
      bgColor: '#e8f5e9',
      tip: '分数高于该专业录取线，录取概率很大，可作为保底志愿'
    }
  };
  return map[category];
}

// ===== 页面交互逻辑 =====

let currentResults = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function () {
  // 初始化页面
  initPage();

  // 绑定分析按钮
  document.getElementById('analyze-btn').addEventListener('click', analyzeScore);

  // 回车触发
  document.getElementById('score').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') analyzeScore();
  });

  // 分类切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.category;
      renderMajorList();
    });
  });

  // 模态框关闭
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
});

function initPage() {
  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 激活导航
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // 导航滚动高亮
  window.addEventListener('scroll', function () {
    const sections = ['home', 'query', 'about'];
    const scrollY = window.scrollY + 100;
    sections.forEach(id => {
      const section = document.getElementById(id);
      if (section) {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        if (scrollY >= top && scrollY < bottom) {
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          const navLink = document.querySelector('.nav-link[href="#' + id + '"]');
          if (navLink) navLink.classList.add('active');
        }
      }
    });
  });
}

function analyzeScore() {
  const scoreInput = document.getElementById('score');
  const subjectType = document.getElementById('subject-type').value;
  const score = parseFloat(scoreInput.value);

  if (!score || score < 0 || score > 750) {
    alert('请输入有效的高考分数（0-750）');
    scoreInput.focus();
    return;
  }

  // 筛选匹配的专业
  currentResults = MAJORS
    .filter(m => {
      if (subjectType === 'physics') {
        return m.type === 'physics' || m.type === 'both';
      } else {
        return m.type === 'history' || m.type === 'both' || m.type === 'art';
      }
    })
    .map(m => {
      const result = calculateProbability(score, m);
      return {
        ...m,
        probability: result.probability,
        category: result.category,
        diff: result.diff
      };
    });

  // 排序：按 冲 → 稳 → 保 顺序显示
  // 同一类别内按分数从高到低排序
  const categoryOrder = { chong: 1, wen: 2, bao: 3 };
  currentResults.sort((a, b) => {
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    return b.minScore - a.minScore;
  });

  // 显示结果区域
  document.getElementById('result-area').classList.remove('hidden');
  document.getElementById('result-area').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 更新统计
  updateStats(score);

  // 更新分数指示器
  updateScoreIndicator(score);

  // 更新建议
  updateSuggestion(score);

  // 渲染专业列表
  renderMajorList();
}

function updateStats(score) {
  const chongCount = currentResults.filter(r => r.category === 'chong').length;
  const wenCount = currentResults.filter(r => r.category === 'wen').length;
  const baoCount = currentResults.filter(r => r.category === 'bao').length;

  document.getElementById('total-count').textContent = currentResults.length;
  document.getElementById('chong-count').textContent = chongCount;
  document.getElementById('wen-count').textContent = wenCount;
  document.getElementById('bao-count').textContent = baoCount;

  document.getElementById('tab-total').textContent = currentResults.length;
  document.getElementById('tab-chong').textContent = chongCount;
  document.getElementById('tab-wen').textContent = wenCount;
  document.getElementById('tab-bao').textContent = baoCount;

  document.getElementById('user-score').textContent = score + ' 分';
}

function updateScoreIndicator(score) {
  // 计算分数在450-540区间的位置
  const min = 450;
  const max = 540;
  let position = ((score - min) / (max - min)) * 100;
  position = Math.max(0, Math.min(100, position));
  document.getElementById('score-indicator').style.left = position + '%';
}

function updateSuggestion(score) {
  const suggEl = document.getElementById('suggestion-text');
  let text = '';
  if (score >= 520) {
    text = '优秀！大部分热门专业都可考虑报考';
  } else if (score >= 500) {
    text = '良好！热门专业可冲刺，多数专业可稳妥报考';
  } else if (score >= 485) {
    text = '中等！建议采用冲稳保结合的志愿策略';
  } else if (score >= 470) {
    text = '不错！可重点关注保底专业，少量冲刺';
  } else if (score >= 450) {
    text = '可考虑应用型专业或专科专业';
  } else {
    text = '分数较低，建议关注专科层次或其他院校';
  }
  suggEl.textContent = text;
}

function renderMajorList() {
  const listEl = document.getElementById('major-list');
  const emptyTip = document.getElementById('empty-tip');

  let filtered = currentResults;
  if (currentFilter !== 'all') {
    filtered = currentResults.filter(r => r.category === currentFilter);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyTip.classList.remove('hidden');
    return;
  }
  emptyTip.classList.add('hidden');

  listEl.innerHTML = filtered.map(m => {
    const info = getCategoryInfo(m.category);
    const probabilityColor =
      m.category === 'bao' ? '#43a047' :
      m.category === 'wen' ? '#ef6c00' :
      '#e53935';

    const probabilityPercent = m.probability;
    const diffText = m.diff >= 0 ? '+' + m.diff : m.diff;

    return `
      <div class="major-card" data-id="${m.id}">
        <div class="major-card-left">
          <div class="major-header">
            <span class="major-category" style="background:${info.bgColor};color:${info.color}">
              ${info.icon} ${info.name}
            </span>
            <h3 class="major-name">${m.name}</h3>
            ${m.tags.map(t => `<span class="major-tag">${t}</span>`).join('')}
          </div>
          <div class="major-college" style="display:none">🏛️ ${m.college}</div>
          <div class="major-meta">
            <div class="meta-item">
              <span class="meta-label">2025最低分</span>
              <span class="meta-value">${m.minScore}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">2025平均分</span>
              <span class="meta-value">${m.avgScore}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">2025最高分</span>
              <span class="meta-value">${m.maxScore}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">招生计划</span>
              <span class="meta-value">${m.plan}人</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">分数差</span>
              <span class="meta-value" style="color:${m.diff >= 0 ? '#43a047' : '#e53935'}">${diffText}</span>
            </div>
          </div>
        </div>
        <div class="major-card-right">
          <div class="probability-circle" style="--color:${probabilityColor}">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#eee" stroke-width="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="${probabilityColor}" stroke-width="10"
                stroke-dasharray="${(probabilityPercent / 100) * 326.7} 326.7"
                stroke-dashoffset="0"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
                style="animation:progressAnim 1s ease-out"/>
            </svg>
            <div class="probability-text">
              <span class="probability-num">${probabilityPercent}</span>
              <span class="probability-unit">%</span>
              <span class="probability-label">录取概率</span>
            </div>
          </div>
          <button class="btn-detail" onclick="showMajorDetail('${m.id}')">查看详情 →</button>
        </div>
      </div>
    `;
  }).join('');
}

function showMajorDetail(id) {
  const major = currentResults.find(m => m.id === id) || MAJORS.find(m => m.id === id);
  if (!major) return;

  // 计算当前分数下的概率
  const score = parseFloat(document.getElementById('score').value);
  let result = null;
  if (score) {
    result = calculateProbability(score, major);
  }

  const info = result ? getCategoryInfo(result.category) : null;

  const modalBody = `
    <div class="detail-header">
      <div class="detail-title-row">
        <h2 class="detail-name">${major.name}</h2>
        ${result ? `<span class="detail-category" style="background:${info.bgColor};color:${info.color}">${info.icon} ${info.name}</span>` : ''}
      </div>
      <div class="detail-college">${major.type === 'physics' ? '物理类' : major.type === 'history' ? '历史类' : '文理兼招'}</div>
      <div class="detail-tags">${major.tags.map(t => `<span class="detail-tag">${t}</span>`).join('')}</div>
    </div>

    ${result ? `
    <div class="detail-probability">
      <div class="detail-prob-card">
        <div class="detail-prob-label">📈 当前分数 ${score} 分的录取概率（参考2025年分数线）</div>
        <div class="detail-prob-num" style="color:${info.color}">${result.probability}%</div>
        <div class="detail-prob-tip">${info.tip}</div>
      </div>
      <div class="detail-score-info">
        <div class="info-item"><span>2025最低</span><strong>${major.minScore}</strong></div>
        <div class="info-item"><span>2025平均</span><strong>${major.avgScore}</strong></div>
        <div class="info-item"><span>2025最高</span><strong>${major.maxScore}</strong></div>
        <div class="info-item"><span>招生计划</span><strong>${major.plan}人</strong></div>
      </div>
    </div>
    ` : ''}

    <section class="detail-section">
      <h3 class="section-label">📋 专业概括</h3>
      <p class="section-content">${major.description}</p>
    </section>

    <section class="detail-section">
      <h3 class="section-label">✨ 专业特色</h3>
      <ul class="feature-list">
        ${major.features.map(f => `<li>🎯 ${f}</li>`).join('')}
      </ul>
    </section>

    <section class="detail-section">
      <h3 class="section-label">📚 主要课程</h3>
      <div class="courses-grid">
        ${major.courses.map(c => `
          <div class="course-item">
            <div class="course-semester">${c.semester}</div>
            <div class="course-content">${c.name}</div>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="detail-section">
      <h3 class="section-label">💼 就业方向</h3>
      <p class="section-content">${major.employment}</p>
    </section>

    <section class="detail-section">
      <h3 class="section-label">👨‍🏫 师资力量</h3>
      <p class="section-content">${major.teachers}</p>
    </section>

    <section class="detail-section">
      <h3 class="section-label">💰 薪资参考</h3>
      <p class="section-content">${major.salary}</p>
    </section>
  `;

  document.getElementById('modal-body').innerHTML = modalBody;
  document.getElementById('major-modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('major-modal').classList.remove('show');
  document.body.style.overflow = '';
}
