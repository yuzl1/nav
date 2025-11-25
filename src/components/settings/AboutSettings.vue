<template>
  <div class="settings-section">
    <h2 class="section-title">关于</h2>

    <div class="form-group version-group" :class="{ 'has-update': hasUpdate, 'checking': isChecking }">
      <div class="form-header">
        <div class="form-content">
          <div class="form-title">
            版本信息
            <span v-if="hasUpdate" class="update-badge">有新版本</span>
            <span v-if="isChecking" class="checking-badge">检查中</span>
            <span v-if="latestVersion && !hasUpdate && !isChecking" class="latest-badge">已是最新版本</span>
          </div>
          <div class="form-description">
            当前版本: v{{ currentVersion }}
            <span v-if="latestVersion && hasUpdate" class="latest-version">
              (最新版本: v{{ latestVersion }})
            </span>
            <span v-if="latestVersion && !hasUpdate" class="current-version">
              (最新版本: v{{ latestVersion }})
            </span>
            <span v-if="error" class="error-text">
              (检查失败: {{ error }})
            </span>
          </div>
          <div v-if="updateInfo && hasUpdate" class="update-details">
            <div class="update-time">
              发布于: {{ formatUpdateTime(updateInfo.published_at) }}
            </div>
          </div>
        </div>
      </div>

      <div class="version-actions">
        <button
            v-if="hasUpdate"
            class="btn btn-primary version-update-btn"
            @click="openUpdateDialog"
        >
          查看完整更新
        </button>
        <button
            class="btn version-check-btn"
            @click="handleCheckForUpdates"
            :disabled="isChecking"
        >
          {{ isChecking ? '检查中...' : '检查更新' }}
        </button>
      </div>
    </div>

    <div v-if="updateInfo && hasUpdate" class="update-content">
      <div class="update-content-header">
        <h4>更新内容 (v{{ latestVersion }})</h4>
      </div>
      <div class="update-content-body" v-html="formatUpdateContent(updateInfo.body)"></div>
    </div>

    <div class="form-group">
      <div class="form-header">
        <div class="form-content">
          <div class="form-title">GitHub 仓库</div>
          <div class="form-description">查看源代码和文档</div>
        </div>
      </div>
      <a
          href="https://github.com/yuzl1/nav"
          target="_blank"
          class="text-btn"
      >
        访问 GitHub
      </a>
    </div>

    <div class="form-group">
      <div class="form-header">
        <div class="form-content">
          <div class="form-title">技术栈</div>
          <div class="form-description">
            Vue 3 + Vite + Supabase + Edge Pages
          </div>
        </div>
      </div>
    </div>

    <div class="form-group">
      <div class="form-header">
        <div class="form-content">
          <div class="form-title">许可证</div>
          <div class="form-description">Apache License 2.0</div>
        </div>
      </div>
    </div>

    <div class="form-group">
      <div class="form-header">
        <div class="form-content">
          <div class="form-title">致谢</div>
          <div class="form-description">
            原项目作者：
            <a href="https://github.com/deerwan" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;">
              Deerwan
            </a>
            <br>
            本项目由 Supabase 社区进行维护和改造
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useVersion } from '../../composables/useVersion'

const {
  currentVersion,
  latestVersion,
  hasUpdate,
  updateInfo,
  isChecking,
  error,
  checkForUpdates,
  formatUpdateTime,
  initialize
} = useVersion()

onMounted(() => {
  initialize()
})

const openUpdateDialog = () => {
  if (updateInfo.value) {
    window.open(updateInfo.value.html_url, '_blank')
  }
}

const handleCheckForUpdates = async () => {
  await checkForUpdates()
}

// 格式化更新内容 (保持原逻辑不变)
const formatUpdateContent = (content) => {
  if (!content) return '暂无更新内容'
  let formatted = content
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/^# (.*$)/gim, '<h2>$1</h2>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>')

  formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')

  return formatted
}
</script>

<style scoped>
.settings-section {
  max-width: 800px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1.5rem;
}


/* ... 其他样式保持不变 ... */
.form-group {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: transparent;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.form-header {
  flex: 1;
}

.form-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.form-description {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.btn {
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 0.9375rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: color 0.2s ease;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
}

.text-btn:hover {
  color: var(--primary);
}

/* 版本检查相关样式 */
.version-group.has-update {
  border-color: #f59e0b;
}
/* ... [省略掉其他样式] ... */
.update-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: #f59e0b;
  color: white;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
  animation: pulse 2s infinite;
}

.checking-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.latest-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: #10b981;
  color: white;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.latest-version {
  color: #f59e0b;
  font-weight: 500;
}

.current-version {
  color: #10b981;
  font-weight: 500;
}

.error-text {
  color: #ef4444;
  font-weight: 500;
}

.update-details {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
}

.update-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.update-content {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
</style>