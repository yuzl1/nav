<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="dialog-overlay" @click="close">
        <div class="dialog-box bookmark-dialog" @click.stop>
          <h3 class="dialog-title">{{ isEdit ? '编辑书签' : '添加书签' }}</h3>

          <div class="form-group">
            <label>名称 *</label>
            <input v-model="form.name" type="text" placeholder="请输入名称">
          </div>

          <div class="form-group">
            <label>URL *</label>
            <input v-model="form.url" type="text" placeholder="https://example.com" class="full-width-input">
          </div>

          <div class="form-group">
            <label>描述</label>
            <div class="description-input-group">
              <input v-model="form.description" type="text" placeholder="可选">
              <button
                  v-if="aiEnabled"
                  type="button"
                  class="ai-generate-btn"
                  :disabled="!form.name || !form.url || generatingDesc"
                  @click="handleGenerateDescription"
                  :title="'AI 生成描述'"
              >
                <svg v-if="!generatingDesc" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <div v-else class="mini-spinner"></div>
                {{ generatingDesc ? 'AI生成中' : 'AI生成' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>图标URL</label>
            <input v-model="form.icon" type="text" placeholder="可选，留空自动获取">
          </div>

          <div class="form-group">
            <label>分类 *</label>
            <div class="category-input-group">
              <select v-model="form.category_id">
                <option value="">请选择分类</option>
                <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                  {{ cat.displayName }}
                </option>
              </select>
              <button
                  v-if="aiEnabled && categoryOptions.length"
                  type="button"
                  class="ai-generate-btn"
                  :disabled="suggestingCategory || !form.name || !form.url"
                  @click="handleSuggestCategory"
                  :title="'AI 推荐分类'"
              >
                <svg v-if="!suggestingCategory" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 20v-6"/>
                  <path d="M6 14l6-6 6 6"/>
                  <path d="M4 10h16"/>
                </svg>
                <div v-else class="mini-spinner"></div>
                {{ suggestingCategory ? '推荐中...' : 'AI 推荐' }}
              </button>
            </div>
            <p v-if="aiSuggestion" class="ai-suggestion">{{ aiSuggestion }}</p>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="form.is_private" type="checkbox">
              <span class="checkbox-text">
                <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                私密书签
              </span>
              <span class="checkbox-description">仅登录后可见</span>
            </label>
          </div>

          <p v-if="error" class="error-message">{{ error }}</p>

          <div class="dialog-buttons">
            <button class="btn btn-secondary" @click="close">取消</button>
            <button class="btn btn-primary" @click="handleSubmit">
              {{ isEdit ? '更新' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookmarks } from '../composables/useBookmarks'
import { useToast } from '../composables/useToast'
import { useAI } from '../composables/useAI'
import { buildCategoryTree, getCategoryPath } from '../utils/categoryTree'

const { categories, addBookmark, updateBookmark } = useBookmarks()
const { success: toastSuccess, error: toastError } = useToast()
const { aiEnabled, checkAIAvailability, generateDescription, suggestCategory } = useAI() // 注意：useAI 需更新为前端直接调用

const show = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const error = ref('')
const generatingDesc = ref(false)
const suggestingCategory = ref(false)
const aiSuggestion = ref('')

const form = ref({
  name: '',
  url: '',
  description: '',
  icon: '',
  category_id: '',
  is_private: false
})

const categoryOptions = computed(() => {
  if (!categories.value.length) return []
  const { flatList, map } = buildCategoryTree(categories.value)
  return flatList.map(cat => ({
    id: cat.id,
    displayName: getCategoryPath(cat.id, map).map(item => item.name).join('/')
  }))
})

const open = (bookmark = null, options = {}) => {
  if (bookmark) {
    isEdit.value = true
    editId.value = bookmark.id
    form.value = {
      name: bookmark.name,
      url: bookmark.url,
      description: bookmark.description || '',
      icon: bookmark.icon || '',
      category_id: bookmark.category_id,
      is_private: !!bookmark.is_private
    }
  } else {
    isEdit.value = false
    editId.value = null
    const presetCategoryId = options.categoryId ?? categories.value[0]?.id ?? ''
    form.value = {
      name: '',
      url: '',
      description: '',
      icon: '',
      category_id: presetCategoryId,
      is_private: false
    }
  }
  error.value = ''
  aiSuggestion.value = ''
  show.value = true
}

const close = () => {
  show.value = false
  aiSuggestion.value = ''
  generatingDesc.value = false
  suggestingCategory.value = false
}

const handleGenerateDescription = async () => {
  if (!form.value.name || !form.value.url) {
    toastError('请先输入名称和 URL')
    return
  }
  generatingDesc.value = true
  error.value = ''
  try {
    const result = await generateDescription(form.value.name, form.value.url)
    if (result.success && result.description) {
      form.value.description = result.description
      toastSuccess('AI 生成描述成功')
    } else {
      toastError(result.error || 'AI 生成描述失败')
    }
  } catch (err) {
    toastError('AI 生成描述失败')
  } finally {
    generatingDesc.value = false
  }
}

const handleSuggestCategory = async () => {
  if (!form.value.name || !form.value.url) {
    toastError('请先输入名称和 URL')
    return
  }
  if (!categoryOptions.value || categoryOptions.value.length === 0) {
    toastError('没有可用的分类')
    return
  }
  suggestingCategory.value = true
  aiSuggestion.value = ''
  try {
    const categoriesForAI = categoryOptions.value.map(cat => ({
      id: cat.id,
      name: cat.displayName,
      path: cat.displayName
    }))
    const result = await suggestCategory(
        form.value.name,
        form.value.url,
        form.value.description || '',
        categoriesForAI
    )
    if (result.success && result.categoryId) {
      const recommendedId = Number.parseInt(result.categoryId, 10)
      if (Number.isInteger(recommendedId)) {
        form.value.category_id = recommendedId
        const matchedCategory = categoryOptions.value.find(cat => cat.id === recommendedId)
        const reasonText = result.reason ? `（${result.reason}）` : ''
        aiSuggestion.value = matchedCategory
            ? `💡 AI 推荐分类：${matchedCategory.displayName}${reasonText}`
            : `💡 AI 推荐分类 ID：${recommendedId}${reasonText}`
        toastSuccess('AI 推荐分类成功')
      } else {
        toastError('AI 返回的分类无效')
      }
    } else {
      toastError(result.error || 'AI 推荐分类失败')
    }
  } catch (err) {
    toastError('AI 推荐分类失败')
  } finally {
    suggestingCategory.value = false
  }
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.url || !form.value.category_id) {
    error.value = '请填写必填项'
    return
  }
  const parsedCategoryId = typeof form.value.category_id === 'number'
      ? form.value.category_id
      : Number.parseInt(form.value.category_id, 10)

  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    error.value = '请选择有效的分类'
    return
  }

  const payload = {
    ...form.value,
    category_id: parsedCategoryId,
    is_private: !!form.value.is_private
  }

  const result = isEdit.value
      ? await updateBookmark(editId.value, payload)
      : await addBookmark(payload)

  if (result.success) {
    toastSuccess(isEdit.value ? '书签已更新' : '书签已添加')
    close()
  } else if (result.duplicate) {
    error.value = result.error || '该 URL 已存在'
    toastError(result.error || '该 URL 已存在')
  } else {
    error.value = result.error || '操作失败'
    toastError(error.value)
  }
}

onMounted(() => {
  // 如果 useAI 没有 checkAIAvailability 方法了（改为直接加载），这里可以去掉
  if (typeof checkAIAvailability === 'function') checkAIAvailability()
})

defineExpose({ open, close })
</script>

<style scoped>
.bookmark-dialog { max-width: 420px; }
.description-input-group, .category-input-group { display: flex; gap: 0.5rem; align-items: stretch; }
.description-input-group input, .category-input-group select { flex: 1; }
.full-width-input { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); color: var(--text); }
.ai-generate-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.65rem 0.875rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: var(--transition); white-space: nowrap; }
.ai-generate-btn:hover:not(:disabled) { background: linear-gradient(135deg, #5568d3 0%, #5e3d85 100%); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3); }
.ai-generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-generate-btn svg { width: 16px; height: 16px; stroke-width: 2; flex-shrink: 0; }
.ai-suggestion { margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(102, 126, 234, 0.1); border-left: 3px solid #667eea; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; }
.mini-spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.checkbox-group { background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--radius-sm); border: 2px solid var(--border); }
.checkbox-label { display: flex; align-items: flex-start; gap: 0.65rem; cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; margin-top: 0.125rem; flex-shrink: 0; }
.checkbox-text { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; font-size: 0.85rem; color: var(--text); }
.lock-icon { width: 14px; height: 14px; stroke-width: 2; color: var(--primary); }
.checkbox-description { display: block; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; margin-left: 24px; }
@media (max-width: 768px) { .bookmark-dialog { max-width: 95%; } .description-input-group, .category-input-group { flex-direction: column; } .ai-generate-btn { width: 100%; justify-content: center; } }
@media (max-width: 480px) { .bookmark-dialog { max-width: 95%; padding: 1rem; } }
</style>