<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="dialog-overlay" @click="close">
        <div class="dialog-box backup-dialog" @click.stop>
          <h3 class="dialog-title">本地备份与恢复</h3>

          <div class="dialog-body">
            <div class="backup-section">
              <div class="section-icon export-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div class="section-content">
                <h4>导出备份</h4>
                <p>将所有数据导出为 JSON 文件保存到本地。</p>
                <button
                    class="btn btn-primary"
                    @click="handleCreateBackup"
                    :disabled="processing"
                >
                  {{ processing ? '导出中...' : '下载备份文件' }}
                </button>
              </div>
            </div>

            <div class="divider"></div>

            <div class="backup-section">
              <div class="section-icon import-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div class="section-content">
                <h4>恢复备份</h4>
                <p>从本地 JSON 文件恢复数据。</p>
                <input
                    type="file"
                    ref="fileInput"
                    accept=".json"
                    style="display: none"
                    @change="handleRestore"
                >
                <button
                    class="btn btn-secondary"
                    @click="$refs.fileInput.click()"
                    :disabled="processing"
                >
                  选择文件恢复
                </button>
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
import { useBackup } from '../composables/useBackup'
import { useBookmarks } from '../composables/useBookmarks'
import { useToast } from '../composables/useToast'
import { supabase } from '../utils/supabase'

// 注意：useBackup 现在只负责导出逻辑，恢复逻辑在前端做比较简单
const { createBackup, processing: backupProcessing } = useBackup()
const { fetchData } = useBookmarks()
const { success: toastSuccess, error: toastError } = useToast()

const show = ref(false)
const processing = ref(false)
const fileInput = ref(null)

const open = () => {
  show.value = true
}

const close = () => {
  show.value = false
}

const handleCreateBackup = async () => {
  processing.value = true
  await createBackup() // 调用 useBackup.js 里的下载逻辑
  processing.value = false
}

const handleRestore = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  processing.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.data || !data.data.categories || !data.data.bookmarks) {
      throw new Error('无效的备份文件')
    }

    // 简单的恢复逻辑：循环插入
    // 1. 插入分类
    const catMap = {} // 旧ID -> 新ID
    for (const cat of data.data.categories) {
      const { data: newCat, error } = await supabase
          .from('categories')
          .insert([{
            name: cat.name,
            position: cat.position,
            is_private: !!cat.is_private
          }])
          .select()

      if (!error && newCat) {
        catMap[cat.id] = newCat[0].id
      }
    }

    // 2. 插入书签
    const bookmarksToInsert = []
    for (const b of data.data.bookmarks) {
      const newCatId = catMap[b.category_id]
      if (newCatId) {
        bookmarksToInsert.push({
          name: b.name,
          url: b.url,
          description: b.description,
          icon: b.icon,
          category_id: newCatId,
          is_private: !!b.is_private,
          position: b.position
        })
      }
    }

    if (bookmarksToInsert.length > 0) {
      await supabase.from('bookmarks').insert(bookmarksToInsert)
    }

    toastSuccess('恢复成功！')
    await fetchData()
    close()
  } catch (e) {
    toastError('恢复失败：' + e.message)
  } finally {
    processing.value = false
    event.target.value = '' // 清空，允许重复选择同一文件
  }
}

defineExpose({ open, close })
</script>

<style scoped>
/* 样式复用 ImportExportDialog 或自定义 */
.backup-dialog { max-width: 500px; }
.dialog-body { padding: 1rem 0; }
.backup-section { display: flex; gap: 1.5rem; padding: 1rem; align-items: flex-start; }
.section-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.export-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.import-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.section-icon svg { width: 24px; height: 24px; stroke-width: 2; }
.section-content { flex: 1; }
.section-content h4 { margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text); }
.section-content p { margin: 0 0 1rem 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }
.divider { height: 1px; background: var(--border); margin: 0.5rem 1.5rem; }
.btn { min-width: 120px; }
</style>