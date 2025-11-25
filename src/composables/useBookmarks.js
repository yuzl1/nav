// src/composables/useBookmarks.js
import { ref, computed } from 'vue'
import { useAuth } from './useAuth'
import { useToast } from './useToast'
import { supabase } from '../utils/supabase'

const categories = ref([])
const bookmarks = ref([])
const searchQuery = ref('')
const searchCategoryId = ref(null)

export function useBookmarks() {
    const { toastError } = useToast() // 假设你导出的是这个名字，或者用 const { error: toastError } = useToast()

    // ... filteredBookmarks 和 bookmarksByCategory 的计算属性代码保持不变 ...
    // (复制你原来的 computed 代码即可，纯前端逻辑不需要改)
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

    const fetchData = async () => {
        try {
            // 获取分类
            const { data: cats, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('position', { ascending: true })

            if (catError) throw catError
            categories.value = cats || []

            // 获取书签
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
            // 检查重复 URL
            const { data: existing } = await supabase
                .from('bookmarks')
                .select('*, categories(name)')
                .eq('url', data.url)
                .single()

            if (existing) {
                // 注意：Supabase 关联查询返回结构不同，这里简化处理
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
                    is_private: !!data.is_private
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
                position: 0 // 默认排序
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

    // 批量操作和排序需要特殊处理，这里提供简单版本
    const reorderItems = async (type, items) => {
        // items 应该是包含 {id, position} 的数组
        try {
            const tableName = type === 'category' ? 'categories' : 'bookmarks'

            // Supabase 不支持单次请求批量更新不同行的不同值，需要循环调用
            // 优化：实际生产中建议写一个 Supabase Database Function (RPC) 来处理
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
        reorderItems
    }
}