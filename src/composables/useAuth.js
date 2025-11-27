// src/composables/useAuth.js
import { ref, computed, watch } from 'vue'
import { supabase } from '../utils/supabase'

// 全局状态
const user = ref(null)
const isAuthenticated = computed(() => !!user.value)
const token = computed(() => user.value?.access_token || '') // 兼容 token 引用

// 存储回调函数
const authCallbacks = []

// 初始化：检查 Session
supabase.auth.getUser().then(({ data }) => {
    user.value = data.user
})

// 监听 Supabase 状态变化
supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user || null
})

// 核心兼容逻辑：当状态变化时，触发所有注册的回调
watch(isAuthenticated, (newVal) => {
    authCallbacks.forEach(cb => cb(newVal))
})

export function useAuth() {

    const login = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (error) throw error
            return { success: true, user: data.user }
        } catch (error) {
            return { success: false, error: error.message || '登录失败' }
        }
    }

    const logout = async () => {
        try {
            await supabase.auth.signOut()
            user.value = null
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    // 兼容旧代码：提供 onAuthChange 方法
    const onAuthChange = (callback) => {
        if (typeof callback === 'function') {
            authCallbacks.push(callback)
        }
    }

    // 兼容旧代码：提供 apiRequest (虽然现在很少用，但防止报错)
    const apiRequest = async (url, options = {}) => {
        // 对于 Supabase 架构，这里其实不需要做太多事，
        // 但为了兼容可能遗漏的 fetch 调用，保留基本透传
        return fetch(url, options)
    }

    // 兼容旧代码：获取 Headers
    const getAuthHeaders = () => ({})

    const checkAuth = async () => {
        const { data } = await supabase.auth.getUser()
        user.value = data.user
        return !!data.user
    }

    return {
        user,
        token, // 兼容
        isAuthenticated,
        login,
        logout,
        onAuthChange, // ✅ 恢复此函数
        getAuthHeaders, // 兼容
        apiRequest, // 兼容
        checkAuth
    }
}