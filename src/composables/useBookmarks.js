// src/composables/useBookmarks.js
import { ref, computed } from 'vue'
import { useAuth } from './useAuth'
import { useToast } from './useToast'
import { supabase } from '../utils/supabase'

// 全局状态
const categories = ref([])
const bookmarks = ref([])
const searchQuery = ref('')
const searchCategoryId = ref(null)

export function useBookmarks() {
    // 假设 useToast 导出了 error 方法，如果没有请根据实际情况调整
    // const { error: toastError } = useToast()

    // ================= 核心数据计算属性 (保持不变) =================
    const filteredBookmarks = computed(() => {
        let result = bookmarks.value
        if (searchCategoryId.value) {
            result = result.filter(b => b.category_id === searchCategoryId.value)
        }
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase()
            result = result.filter(b =>
                b.name.toLowerCase().includes(q) ||
                b.url.toLowerCase().includes(q) ||
                (b.description && b.description.toLowerCase().includes(q))
            )
        }
        return result
    })

    const bookmarksByCategory = computed(() => {
        const result = {}
        categories.value.forEach(category => {
            result[category.id] = filteredBookmarks.value
                .filter(b => b.category_id === category.id)
                .sort((a, b) => a.position - b.position)
        })
        return result
    })

    // ================= 基础 CRUD (保持不变) =================
    const fetchData = async () => {
        try {
            const { data: cats, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('position', { ascending: true })
            if (catError) throw catError
            categories.value = cats || []

            const { data: books, error: bookError } = await supabase
                .from('bookmarks')
                .select('*')
                .order('position', { ascending: true })
            if (bookError) throw bookError
            bookmarks.value = books || []
        } catch (error) {
            console.error('Failed to fetch data:', error)
        }
    }

    const addBookmark = async (data) => {
        try {
            const { data: existing } = await supabase
                .from('bookmarks')
                .select('*, categories(name)')
                .eq('url', data.url)
                .single()

            if (existing) {
                return {
                    success: false,
                    duplicate: true,
                    error: `该 URL 已存在`,
                    existingBookmark: existing
                }
            }

            const { error } = await supabase.from('bookmarks').insert([{
                name: data.name,
                url: data.url,
                description: data.description,
                icon: data.icon,
                category_id: data.category_id,
                is_private: !!data.is_private,
                position: data.position || 0
            }])

            if (error) throw error
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const updateBookmark = async (id, data) => {
        try {
            const { error } = await supabase
                .from('bookmarks')
                .update({
                    name: data.name,
                    url: data.url,
                    description: data.description,
                    icon: data.icon,
                    category_id: data.category_id,
                    is_private: !!data.is_private,
                    position: data.position // 允许更新位置
                })
                .eq('id', id)

            if (error) throw error
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const deleteBookmark = async (id) => {
        try {
            const { error } = await supabase.from('bookmarks').delete().eq('id', id)
            if (error) throw error
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const addCategory = async (name, parentId = null, isPrivate = false) => {
        try {
            const { error } = await supabase.from('categories').insert([{
                name,
                parent_id: parentId,
                is_private: !!isPrivate,
                position: 0
            }])

            if (error) throw error
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const updateCategory = async (id, name, parentId = undefined, isPrivate = undefined) => {
        try {
            const updates = { name }
            if (parentId !== undefined) updates.parent_id = parentId
            if (isPrivate !== undefined) updates.is_private = !!isPrivate

            const { error } = await supabase.from('categories').update(updates).eq('id', id)

            if (error) throw error
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const deleteCategory = async (id) => {
        try {
            const { error } = await supabase.from('categories').delete().eq('id', id)
            if (error) throw error
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // ================= 补充的缺失方法 =================

    // 1. 批量操作 (Batch Operations)
    // 支持: delete (书签), delete-categories (分类), move (书签), edit (书签属性)
    const batchOperation = async (operation, bookmarkIds, data = {}, categoryIds = null) => {
        try {
            let error = null

            if (operation === 'delete' && bookmarkIds?.length > 0) {
                // 批量删除书签
                const res = await supabase.from('bookmarks').delete().in('id', bookmarkIds)
                error = res.error
            }
            else if (operation === 'delete-categories' && categoryIds?.length > 0) {
                // 批量删除分类 (级联删除由数据库外键处理)
                const res = await supabase.from('categories').delete().in('id', categoryIds)
                error = res.error
            }
            else if (operation === 'move' && bookmarkIds?.length > 0 && data.categoryId) {
                // 批量移动书签
                const res = await supabase
                    .from('bookmarks')
                    .update({ category_id: data.categoryId })
                    .in('id', bookmarkIds)
                error = res.error
            }
            else if (operation === 'edit' && bookmarkIds?.length > 0) {
                // 批量修改属性 (目前主要是 is_private)
                if (data.isPrivate !== undefined) {
                    const res = await supabase
                        .from('bookmarks')
                        .update({ is_private: !!data.isPrivate })
                        .in('id', bookmarkIds)
                    error = res.error
                }
            }

            if (error) throw error

            await fetchData() // 操作完刷新数据
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message || '批量操作失败' }
        }
    }

    // 2. 获取空分类 (Get Empty Categories)
    // 逻辑：获取所有分类 -> 获取所有有书签的分类ID -> 找出差集
    const getEmptyCategories = async () => {
        try {
            // 1. 查所有分类
            const { data: allCats, error: catError } = await supabase
                .from('categories')
                .select('id, name')

            if (catError) throw catError

            // 2. 查所有被书签使用的分类ID (去重)
            // 注意：Supabase 没有原生的 distinct 查询，但我们可以查出来在 JS 里去重，或者用 .csv() 导出
            // 这里数据量不大，直接查 category_id
            const { data: usedCats, error: bookError } = await supabase
                .from('bookmarks')
                .select('category_id')

            if (bookError) throw bookError

            // 3. 计算空分类
            const usedSet = new Set(usedCats.map(b => b.category_id))
            const emptyCategories = allCats.filter(c => !usedSet.has(c.id))

            return {
                success: true,
                emptyCategories: emptyCategories || [],
                count: emptyCategories.length
            }
        } catch (error) {
            return { success: false, error: error.message || '获取空分类失败' }
        }
    }

    // 3. 清理空分类 (Cleanup Empty Categories)
    // 逻辑：复用 getEmptyCategories 获取ID -> 批量删除
    const cleanupEmptyCategories = async () => {
        try {
            // 先获取空分类
            const result = await getEmptyCategories()
            if (!result.success) throw new Error(result.error)

            const emptyIds = result.emptyCategories.map(c => c.id)

            if (emptyIds.length === 0) {
                return { success: true, deletedCount: 0, deletedCategories: [] }
            }

            // 执行删除
            const { error } = await supabase
                .from('categories')
                .delete()
                .in('id', emptyIds)

            if (error) throw error

            await fetchData() // 刷新

            return {
                success: true,
                deletedCount: emptyIds.length,
                deletedCategories: result.emptyCategories
            }
        } catch (error) {
            return { success: false, error: error.message || '清理空分类失败' }
        }
    }

    // 排序功能 (保持不变)
    const reorderItems = async (type, items) => {
        try {
            const tableName = type === 'category' ? 'categories' : 'bookmarks'
            // 批量更新排序
            const updates = items.map(item =>
                supabase.from(tableName).update({ position: item.position }).eq('id', item.id)
            )
            await Promise.all(updates)
            await fetchData()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return {
        categories, bookmarks, searchQuery, searchCategoryId,
        filteredBookmarks, bookmarksByCategory,
        fetchData, addBookmark, updateBookmark, deleteBookmark,
        addCategory, updateCategory, deleteCategory,
        reorderItems,
        // 新增导出的方法
        batchOperation,
        getEmptyCategories,
        cleanupEmptyCategories
    }
}