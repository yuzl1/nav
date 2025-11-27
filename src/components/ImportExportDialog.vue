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

// 导出为 HTML
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
    const safeName = (category.name || 'Untitled').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
    let output = `${indent}<DT><H3>${safeName}</H3>\n`
    output += `${indent}<DL><p>\n`

    const categoryBookmarks = bookmarksByCategory[category.id] || []
    categoryBookmarks.forEach(bookmark => {
      const timestamp = Math.floor(new Date(bookmark.created_at).getTime() / 1000)
      const safeUrl = (bookmark.url || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
      const safeTitle = (bookmark.name || 'Untitled').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
      output += `${indent}    <DT><A HREF="${safeUrl}" ADD_DATE="${timestamp}">${safeTitle}</A>\n`
      if (bookmark.description) {
        const safeDesc = bookmark.description.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
        output += `${indent}    <DD>${safeDesc}\n`
      }
    })

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

const selectFile = () => {
  fileInput.value.click()
}

// 核心：执行数据库导入 (Supabase 逻辑)
const executeImport = async (categoriesToImport, bookmarksToImport) => {
  const stats = {
    imported: { categories: 0, bookmarks: 0 },
    skipped: { categories: 0, bookmarks: 0 },
    details: { skippedItems: [] }
  }

  const idMap = {} // 旧ID -> 新ID

  importStatus.value = `正在导入分类 (共 ${categoriesToImport.length} 个)...`
  let processedCats = 0

  // 按深度排序，确保父分类先创建
  const sortedCats = [...categoriesToImport].sort((a, b) => (a.depth || 0) - (b.depth || 0))

  for (const cat of sortedCats) {
    processedCats++
    importProgress.value = 20 + Math.floor((processedCats / categoriesToImport.length) * 30)

    try {
      let newParentId = null
      if (cat.parent_id && idMap[cat.parent_id]) {
        newParentId = idMap[cat.parent_id]
      }

      // 检查是否存在同名分类（避免重复）
      const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('name', cat.name)
          .eq('parent_id', newParentId || null) // 使用 "is" 语法处理 null，但在 supabase js client 中 .eq 也能处理 null
          // 注意：如果 parent_id 是 null，Supabase 的 eq('parent_id', null) 可能无法匹配 SQL 的 IS NULL
          // 最好使用 filter('parent_id', 'is', null) 或者依赖 .maybeSingle 返回空
          .maybeSingle()

      // 特殊处理 parent_id 为 null 的查询情况
      let existingId = null
      if (!newParentId) {
        const { data: rootExisting } = await supabase
            .from('categories')
            .select('id')
            .eq('name', cat.name)
            .is('parent_id', null)
            .maybeSingle()
        if (rootExisting) existingId = rootExisting.id
      } else if (existing) {
        existingId = existing.id
      }

      if (existingId) {
        idMap[cat.id] = existingId
        stats.skipped.categories++
      } else {
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

        if (!error && newCat) {
          stats.imported.categories++
          idMap[cat.id] = newCat.id
        } else {
          console.error('Category insert failed:', error)
        }
      }
    } catch (e) {
      console.error('Import category error', e)
    }
  }

  // 导入书签
  importStatus.value = `正在导入书签 (共 ${bookmarksToImport.length} 个)...`
  const bookmarksPayload = []

  for (const bm of bookmarksToImport) {
    const newCategoryId = idMap[bm.category_id]

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
      // 找不到分类，放入"导入的书签"（如果存在）或者跳过
      stats.skipped.bookmarks++
    }
  }

  if (bookmarksPayload.length > 0) {
    // 分批插入，避免一次性包太大
    const BATCH_SIZE = 50
    for (let i = 0; i < bookmarksPayload.length; i += BATCH_SIZE) {
      const chunk = bookmarksPayload.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('bookmarks').insert(chunk)
      if (!error) {
        stats.imported.bookmarks += chunk.length
      } else {
        console.error('Batch insert error', error)
        stats.skipped.bookmarks += chunk.length
        stats.details.skippedItems.push({ type: 'batch', name: '批量书签', reason: error.message })
      }
      importProgress.value = 50 + Math.floor(((i + chunk.length) / bookmarksPayload.length) * 50)
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

  let categories = []
  let bookmarks = []
  let catCounter = 0
  let bookmarkCounter = 0

  // 辅助结构
  const processedDLs = new WeakSet()

  const findNextDL = (element) => {
    if (!element) return null
    if (element.tagName === 'DL') return element
    let sibling = element.nextElementSibling
    while (sibling) {
      if (sibling.tagName === 'DL') return sibling
      // 如果遇到新的 DT，说明当前 DT 没有子 DL
      if (sibling.tagName === 'DT') return null
      sibling = sibling.nextElementSibling
    }
    return null
  }

  const findDirectChild = (element, tagName) => {
    return Array.from(element.children).find(child => child.tagName === tagName)
  }

  // 策略 A: 尝试递归解析目录结构
  const parseBookmarkNode = (node, currentCategoryId = null, currentParentId = null, depth = 0) => {
    if (depth > 10) return // 防止死循环
    const children = Array.from(node.children)

    for (const child of children) {
      // 1. 识别分类 (H3)
      if (child.tagName === 'H3' || (child.tagName === 'DT' && child.querySelector('h3'))) {
        const h3 = child.tagName === 'H3' ? child : child.querySelector('h3')
        const categoryName = h3.textContent.trim()

        // 获取容器 DL
        let dlElement = null
        if (child.tagName === 'DT') {
          dlElement = findDirectChild(child, 'DL') || findNextDL(h3)
        } else {
          dlElement = findNextDL(child)
        }

        // 跳过无名分类或部分根标识 (可选：根据需要跳过 bookmarks/书签栏 等根节点)
        if (!categoryName) {
          if (dlElement) {
            processedDLs.add(dlElement)
            parseBookmarkNode(dlElement, currentCategoryId, currentParentId, depth)
          }
          continue
        }

        const currentId = ++catCounter
        // 记录分类
        categories.push({
          id: currentId,
          name: categoryName,
          parent_id: currentParentId,
          depth: depth,
          position: catCounter,
          is_private: false
        })

        // 递归处理子内容
        if (dlElement) {
          processedDLs.add(dlElement)
          parseBookmarkNode(dlElement, currentId, currentId, depth + 1)
        }
      }
      // 2. 识别书签 (A)
      else if (child.tagName === 'A' || (child.tagName === 'DT' && child.querySelector('a'))) {
        const a = child.tagName === 'A' ? child : child.querySelector('a')
        const url = a.getAttribute('href')
        const name = a.textContent.trim() || url

        if (url && (url.startsWith('http') || url.startsWith('https'))) {
          bookmarks.push({
            id: ++bookmarkCounter,
            name: name,
            url: url,
            description: '',
            icon: a.getAttribute('icon') || '',
            category_id: currentCategoryId, // 可能为 null
            position: bookmarkCounter,
            is_private: false
          })
        }
      }
      // 3. 处理容器 (DL) - 有些格式直接嵌套 DL
      else if (child.tagName === 'DL') {
        if (!processedDLs.has(child)) {
          parseBookmarkNode(child, currentCategoryId, currentParentId, depth)
        }
      }
    }
  }

  // 执行策略 A
  parseBookmarkNode(doc.body, null, null, 0)

  // === 策略 B: 兜底方案 (Fallback) ===
  // 如果策略 A 没找到任何书签，说明结构解析失败，改用暴力查找所有 <a> 标签
  if (bookmarks.length === 0) {
    console.warn('结构化解析未找到书签，切换到扁平扫描模式...')
    const allLinks = doc.querySelectorAll('a')

    if (allLinks.length > 0) {
      // 创建一个默认分类来存放所有书签
      const fallbackCatId = ++catCounter
      categories.push({
        id: fallbackCatId,
        name: '导入的书签 (自动扫描)',
        parent_id: null,
        depth: 0,
        position: 0,
        is_private: false
      })

      allLinks.forEach((a, index) => {
        const url = a.getAttribute('href')
        const name = a.textContent.trim() || url

        if (url && (url.startsWith('http') || url.startsWith('https'))) {
          bookmarks.push({
            id: ++bookmarkCounter,
            name: name,
            url: url,
            category_id: fallbackCatId, // 全部放入兜底分类
            position: index,
            is_private: false,
            icon: a.getAttribute('icon') || '',
            description: ''
          })
        }
      })
    }
  }

  // 后处理：检查是否有没分配分类的孤儿书签 (策略 A 遗留的根目录书签)
  const orphanBookmarks = bookmarks.filter(b => !b.category_id)
  if (orphanBookmarks.length > 0) {
    // 查找或创建"其他书签"分类
    let otherCatId = categories.find(c => c.name === '其他书签' && !c.parent_id)?.id

    if (!otherCatId) {
      otherCatId = ++catCounter
      categories.push({
        id: otherCatId,
        name: '其他书签',
        parent_id: null,
        depth: 0,
        position: 9999,
        is_private: false
      })
    }

    orphanBookmarks.forEach(b => b.category_id = otherCatId)
  }

  console.log(`解析结果: ${categories.length} 个分类, ${bookmarks.length} 个书签`)

  if (categories.length === 0 && bookmarks.length === 0) {
    throw new Error('文件解析失败：未找到任何有效的书签链接。\n请确认上传的是浏览器导出的 HTML 书签文件。')
  }

  // 执行导入
  importStatus.value = `解析完成，准备上传 ${bookmarks.length} 个书签...`
  const stats = await executeImport(categories, bookmarks)

  importProgress.value = 100
  importStatus.value = '导入完成'

  const msg = `✅ 导入成功！\n\n新增：${stats.imported.categories} 个分类，${stats.imported.bookmarks} 个书签`
  importResult.value = { success: true, message: msg }

  setTimeout(async () => {
    await fetchData()
  }, 1000)
}

defineExpose({ open, close })
</script>

<style scoped>
/* 样式保持不变 */
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