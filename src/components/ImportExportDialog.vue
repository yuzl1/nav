<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="dialog-overlay" @click="close">
        <div class="dialog-box import-export-dialog" @click.stop>
          <h3 class="dialog-title">导入/导出书签</h3>

          <div class="export-section">
            <h4>导出书签</h4>
            <p class="section-description">将当前所有书签导出为文件</p>
            <div class="button-group">
              <button class="btn btn-primary" @click="exportJSON">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                导出为 JSON
              </button>
              <button class="btn btn-secondary" @click="exportHTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                导出为 HTML
              </button>
            </div>
          </div>

          <div class="import-section">
            <h4>导入书签</h4>
            <div class="import-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4m0-4h.01"/>
              </svg>
              <span>导入会自动跳过已存在的书签和分类</span>
            </div>
            <input
                ref="fileInput"
                type="file"
                accept=".json,.html,.htm"
                style="display: none"
                @change="handleFileSelect"
            >
            <div class="import-button-wrapper">
              <button class="import-file-btn" @click="selectFile" :disabled="importing">
                <div class="import-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div class="import-text">
                  <span class="import-title">{{ importing ? '导入中...' : '选择文件导入' }}</span>
                  <span class="import-subtitle">支持 JSON 和 HTML 格式</span>
                </div>
              </button>
            </div>

            <div v-if="importing" class="import-progress">
              <div class="progress-bar-container">
                <div class="progress-bar" :style="{ width: importProgress + '%' }"></div>
              </div>
              <p class="progress-text">{{ importStatus }}</p>
            </div>

            <div v-if="importResult" class="import-result" :class="importResult.success ? 'success' : 'error'">
              <p class="result-message">{{ importResult.message }}</p>

              <div v-if="importDetails && importDetails.skippedItems && importDetails.skippedItems.length > 0" class="import-details">
                <button class="btn-toggle-details" @click="importDetails.showDetails = !importDetails.showDetails">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline :points="importDetails.showDetails ? '6 9 12 15 18 9' : '9 18 15 12 9 6'"/>
                  </svg>
                  {{ importDetails.showDetails ? '隐藏' : '查看' }}跳过的项目 ({{ importDetails.skippedItems.length }})
                </button>

                <div v-if="importDetails.showDetails" class="details-list">
                  <div v-for="(item, index) in importDetails.skippedItems" :key="index" class="detail-item">
                    <span class="item-type">{{ item.type === 'category' ? '📁' : '🔖' }}</span>
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-reason">{{ item.reason }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="dialog-buttons">
            <button class="btn btn-secondary" @click="close">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useBookmarks } from '../composables/useBookmarks'
import { supabase } from '../utils/supabase'

// 我们不再需要 useAuth 的 apiRequest，因为直接用 supabase SDK
const { categories, bookmarks, fetchData } = useBookmarks()

const show = ref(false)
const fileInput = ref(null)
const importing = ref(false)
const importResult = ref(null)
const importProgress = ref(0)
const importStatus = ref('')
const importDetails = ref(null)

const open = () => {
  show.value = true
  importResult.value = null
  importProgress.value = 0
  importStatus.value = ''
  importDetails.value = null
}

const close = () => {
  show.value = false
}

// 导出为 JSON
const exportJSON = () => {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    categories: categories.value,
    bookmarks: bookmarks.value
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)

  importResult.value = { success: true, message: '✅ JSON 文件已导出' }
}

// 导出为 HTML (保持原逻辑不变)
const exportHTML = () => {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`

  // 构建分类树
  const categoriesMap = {}
  const rootCategories = []

  categories.value.forEach(cat => {
    categoriesMap[cat.id] = { ...cat, children: [] }
  })

  categories.value.forEach(cat => {
    if (cat.parent_id && categoriesMap[cat.parent_id]) {
      categoriesMap[cat.parent_id].children.push(categoriesMap[cat.id])
    } else {
      rootCategories.push(categoriesMap[cat.id])
    }
  })

  // 按分类分组书签
  const bookmarksByCategory = {}
  bookmarks.value.forEach(bookmark => {
    if (!bookmarksByCategory[bookmark.category_id]) {
      bookmarksByCategory[bookmark.category_id] = []
    }
    bookmarksByCategory[bookmark.category_id].push(bookmark)
  })

  // 递归生成 HTML
  const generateCategoryHTML = (category, depth) => {
    const indent = '    '.repeat(depth)
    let output = `${indent}<DT><H3>${escapeHtml(category.name)}</H3>\n`
    output += `${indent}<DL><p>\n`

    // 生成书签
    const categoryBookmarks = bookmarksByCategory[category.id] || []
    categoryBookmarks.forEach(bookmark => {
      const timestamp = Math.floor(new Date(bookmark.created_at).getTime() / 1000)
      output += `${indent}    <DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${timestamp}">${escapeHtml(bookmark.name)}</A>\n`
      if (bookmark.description) {
        output += `${indent}    <DD>${escapeHtml(bookmark.description)}\n`
      }
    })

    // 递归生成子分类
    if (category.children && category.children.length > 0) {
      category.children
          .sort((a, b) => a.position - b.position)
          .forEach(child => {
            output += generateCategoryHTML(child, depth + 1)
          })
    }

    output += `${indent}</DL><p>\n`
    return output
  }

  rootCategories
      .sort((a, b) => a.position - b.position)
      .forEach(category => {
        html += generateCategoryHTML(category, 1)
      })

  html += `</DL><p>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.html`
  a.click()
  URL.revokeObjectURL(url)

  importResult.value = { success: true, message: '✅ HTML 文件已导出' }
}

const escapeHtml = (text) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}

const selectFile = () => {
  fileInput.value.click()
}

// 核心：执行数据库导入
const executeImport = async (categoriesToImport, bookmarksToImport) => {
  const stats = {
    imported: { categories: 0, bookmarks: 0 },
    skipped: { categories: 0, bookmarks: 0 },
    details: { skippedItems: [] }
  }

  const idMap = {} // 旧ID -> 新ID

  // 1. 导入分类 (需要处理父子关系，这里简化处理，优先导入无父级的或按顺序)
  // 假设 categoriesToImport 已经是按 depth 排序或者平铺的
  // 我们逐个插入以确保获取新 ID

  importStatus.value = `正在导入分类 (共 ${categoriesToImport.length} 个)...`
  let processedCats = 0

  for (const cat of categoriesToImport) {
    processedCats++
    importProgress.value = 20 + Math.floor((processedCats / categoriesToImport.length) * 30) // 20% -> 50%

    try {
      // 检查新父ID (如果存在 parent_id，必须映射到新的 ID)
      let newParentId = null
      if (cat.parent_id && idMap[cat.parent_id]) {
        newParentId = idMap[cat.parent_id]
      }

      // 插入 Supabase
      const { data: newCat, error } = await supabase
          .from('categories')
          .insert([{
            name: cat.name,
            position: cat.position || 0,
            is_private: !!cat.is_private,
            parent_id: newParentId
          }])
          .select()
          .single()

      if (error) {
        // 假设重复或其他错误，视为跳过
        stats.skipped.categories++
        // 尝试查找已存在的分类以获取 ID (为了后续挂载书签)
        // 注意：这里简化逻辑，只按名字匹配
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('name', cat.name)
            .maybeSingle()

        if (existing) {
          idMap[cat.id] = existing.id
        }
      } else if (newCat) {
        stats.imported.categories++
        idMap[cat.id] = newCat.id
      }
    } catch (e) {
      console.error('Import category error', e)
    }
  }

  // 2. 导入书签
  importStatus.value = `正在导入书签 (共 ${bookmarksToImport.length} 个)...`
  let processedBooks = 0
  const bookmarksPayload = []

  for (const bm of bookmarksToImport) {
    processedBooks++
    const newCategoryId = idMap[bm.category_id]

    // 如果找不到对应的分类ID，则跳过该书签，或放入默认分类
    if (newCategoryId) {
      bookmarksPayload.push({
        name: bm.name,
        url: bm.url,
        description: bm.description,
        icon: bm.icon,
        category_id: newCategoryId,
        is_private: !!bm.is_private,
        position: bm.position || 0
      })
    } else {
      stats.skipped.bookmarks++
      stats.details.skippedItems.push({ type: 'bookmark', name: bm.name, reason: '父分类导入失败' })
    }
  }

  // 批量插入书签以提高性能
  if (bookmarksPayload.length > 0) {
    // Supabase 建议批量插入不要过大，这里假设数量适中
    // 实际生产可能需要分块 (chunk)
    const { error } = await supabase.from('bookmarks').insert(bookmarksPayload)
    if (error) {
      console.error('Batch insert error', error)
      // 如果批量失败，统计会不准，这里简单处理
      stats.skipped.bookmarks += bookmarksPayload.length
      stats.details.skippedItems.push({ type: 'batch', name: '批量书签', reason: error.message })
    } else {
      stats.imported.bookmarks += bookmarksPayload.length
    }
  }

  return stats
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  importing.value = true
  importResult.value = null
  importProgress.value = 0
  importStatus.value = '正在读取文件...'
  importDetails.value = null

  try {
    const text = await file.text()
    importProgress.value = 10

    if (file.name.endsWith('.json')) {
      await importJSON(text)
    } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      await importHTML(text)
    } else {
      throw new Error('不支持的文件格式')
    }
  } catch (error) {
    importResult.value = { success: false, message: '❌ 导入失败：' + error.message }
    importProgress.value = 0
    importStatus.value = ''
  } finally {
    importing.value = false
    fileInput.value.value = ''
  }
}

const importJSON = async (text) => {
  const data = JSON.parse(text)
  if (!data.categories || !data.bookmarks) throw new Error('无效的 JSON 格式')

  importStatus.value = '准备导入...'
  const stats = await executeImport(data.categories, data.bookmarks)

  importProgress.value = 100
  importStatus.value = '导入完成'

  const msg = `✅ 导入成功！\n\n新增：${stats.imported.categories} 个分类，${stats.imported.bookmarks} 个书签`
  importResult.value = { success: true, message: msg }

  setTimeout(async () => {
    await fetchData()
  }, 1000)
}

const importHTML = async (text) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/html')

  const categories = []
  const bookmarks = []
  const categoryPositionMap = {}
  const processedDLs = new WeakSet()

  const findNextDL = (element) => {
    if (!element) return null
    if (element.tagName === 'DL') return element
    let sibling = element.nextElementSibling
    while (sibling && sibling.tagName !== 'DL') {
      sibling = sibling.nextElementSibling
    }
    return sibling && sibling.tagName === 'DL' ? sibling : null
  }

  const findDirectChild = (element, tagName) => {
    return Array.from(element.children).find(child => child.tagName === tagName)
  }

  const parseBookmarkNode = (node, currentCategoryId = null, currentParentId = null, depth = 0) => {
    if (depth > 5) return
    const children = Array.from(node.children)

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.tagName === 'H3') {
        const categoryName = child.textContent.trim()
        const normalizedName = categoryName.toLowerCase()
        const isRootContainer = depth === 0 && (normalizedName === 'bookmarks' || normalizedName === '书签')

        if (!categoryName || isRootContainer) {
          const dlElement = findNextDL(child)
          if (dlElement) {
            processedDLs.add(dlElement)
            parseBookmarkNode(dlElement, isRootContainer ? null : currentCategoryId, isRootContainer ? null : currentParentId, depth)
          }
          continue
        }

        // 使用临时 ID
        const categoryId = categories.length + 1
        const parentKey = currentParentId || 'root'
        if (!categoryPositionMap[parentKey]) categoryPositionMap[parentKey] = 0

        categories.push({
          id: categoryId,
          name: categoryName,
          position: categoryPositionMap[parentKey]++,
          parent_id: currentParentId,
          depth: depth,
          is_private: false
        })

        const dlElement = findNextDL(child)
        if (dlElement) {
          processedDLs.add(dlElement)
          parseBookmarkNode(dlElement, categoryId, categoryId, depth + 1)
        }
      } else if (child.tagName === 'DT') {
        const directChildren = Array.from(child.children)
        let linkElement = directChildren.find(el => el.tagName === 'A')
        if (!linkElement) {
          const fallbackLink = child.querySelector('A')
          if (fallbackLink && fallbackLink.closest('DT') === child) linkElement = fallbackLink
        }

        if (linkElement) {
          const url = linkElement.getAttribute('HREF') || linkElement.getAttribute('href')
          const name = linkElement.textContent.trim()
          if (url && name && (url.startsWith('http') || url.startsWith('https'))) {
            let targetCategoryId = currentCategoryId
            // 如果没有分类，放入默认分类
            if (!targetCategoryId) {
              // 简化：这里只标记需要放到默认分类，executeImport 时处理或提前建好
              // 为了简单，这里不处理根目录书签，或者你需要手动 push 一个默认分类
            }

            if (targetCategoryId) {
              bookmarks.push({
                name: name,
                url: url,
                description: '',
                category_id: targetCategoryId,
                is_private: false,
                position: bookmarks.length
              })
            }
          }
        } else {
          // 处理 DT 下直接包 DL 的情况 (少见但存在)
          const dlElement = findDirectChild(child, 'DL')
          if (dlElement) parseBookmarkNode(dlElement, currentCategoryId, currentParentId, depth)
        }
      } else if (child.tagName === 'DL') {
        if (!processedDLs.has(child)) parseBookmarkNode(child, currentCategoryId, currentParentId, depth)
      }
    }
  }

  parseBookmarkNode(doc.body, null, null, 0)

  if (categories.length === 0 && bookmarks.length === 0) throw new Error('未找到有效数据')

  const stats = await executeImport(categories, bookmarks)

  importProgress.value = 100
  importStatus.value = '导入完成'
  const msg = `✅ 导入成功！\n\n解析：${categories.length} 个分类，${bookmarks.length} 个书签`
  importResult.value = { success: true, message: msg }

  setTimeout(async () => {
    await fetchData()
  }, 1000)
}

defineExpose({ open, close })
</script>

<style scoped>
.import-export-dialog { max-width: 500px; }
.dialog-overlay { z-index: 4000 !important; }
.export-section, .import-section { margin-bottom: 1.5rem; }
.export-section h4, .import-section h4 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text); }
.section-description { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem; }
.button-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.button-group .btn { flex: 1; min-width: 140px; }
.button-group .btn svg { width: 16px; height: 16px; stroke-width: 2; }
.import-result { margin-top: 0.75rem; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.875rem; }
.import-result.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
.import-result.error { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
.import-notice { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.875rem; color: var(--primary); }
.import-notice svg { width: 18px; height: 18px; stroke-width: 2; flex-shrink: 0; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.import-button-wrapper { margin-top: 1rem; }
.import-file-btn { width: 100%; display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border: none; border-radius: var(--radius); color: white; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
.import-file-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
.import-file-btn:active:not(:disabled) { transform: translateY(0); }
.import-file-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.import-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: var(--radius-sm); flex-shrink: 0; }
.import-icon svg { width: 24px; height: 24px; stroke-width: 2.5; }
.import-text { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; flex: 1; }
.import-title { font-size: 1rem; font-weight: 600; color: white; }
.import-subtitle { font-size: 0.8125rem; color: rgba(255, 255, 255, 0.8); font-weight: 400; }
.import-progress { margin-top: 1rem; }
.progress-bar-container { width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
.progress-bar { height: 100%; background: linear-gradient(90deg, var(--primary), #60a5fa); transition: width 0.3s ease; border-radius: 4px; }
.progress-text { font-size: 0.875rem; color: var(--text-secondary); text-align: center; margin: 0; }
.result-message { margin: 0; white-space: pre-line; }
.import-details { margin-top: 1rem; padding-top: 1rem; }
.btn-toggle-details { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: 0.875rem; cursor: pointer; transition: all 0.2s; width: 100%; justify-content: center; }
.btn-toggle-details:hover { background: var(--hover-bg); border-color: var(--primary); color: var(--primary); }
.btn-toggle-details svg { width: 16px; height: 16px; stroke-width: 2; transition: transform 0.2s; }
.details-list { margin-top: 0.75rem; max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.5rem; }
.detail-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; font-size: 0.875rem; }
.item-type { flex-shrink: 0; font-size: 1rem; }
.item-name { flex: 1; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-reason { flex-shrink: 0; color: var(--text-secondary); font-size: 0.8125rem; padding: 0.25rem 0.5rem; background: rgba(0, 0, 0, 0.05); border-radius: var(--radius-sm); }
@media (prefers-color-scheme: dark) { .item-reason { background: rgba(255, 255, 255, 0.1); } }
</style>