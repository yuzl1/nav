// src/composables/useBackup.js
import { ref } from 'vue'
import { supabase } from '../utils/supabase'
import { useToast } from './useToast'

export function useBackup() {
    const { success: toastSuccess, error: toastError } = useToast()
    const processing = ref(false)

    // 导出备份 (生成 JSON 文件下载)
    const createBackup = async () => {
        processing.value = true
        try {
            const [ { data: cats }, { data: books } ] = await Promise.all([
                supabase.from('categories').select('*'),
                supabase.from('bookmarks').select('*')
            ])

            const backupData = {
                version: '1.0',
                date: new Date().toISOString(),
                data: { categories: cats, bookmarks: books }
            }

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `nav-backup-${new Date().toISOString().slice(0,10)}.json`
            a.click()
            URL.revokeObjectURL(url)

            toastSuccess('备份已下载')
        } catch (e) {
            toastError('备份失败: ' + e.message)
        } finally {
            processing.value = false
        }
    }

    // 恢复备份 (读取 JSON 文件并插入数据库)
    const restoreBackup = async (file) => {
        // 需要在前端实现一个文件上传框，读取文件内容后调用此函数
        // 逻辑：JSON.parse(fileContent) -> 遍历插入 Supabase
        // 这里仅提供框架，具体实现取决于 UI 交互
        console.log('Restore logic needs UI implementation')
    }

    return {
        createBackup,
        restoreBackup,
        processing
    }
}