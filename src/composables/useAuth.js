// src/composables/useAuth.js
import { ref, computed, watch } from 'vue'
import { supabase } from '../utils/supabase'

// 全局状态
const user = ref(null)
const isAuthenticated = computed(() => !!user.value)
const token = computed(() => user.value?.access_token || '') // 兼容旧代码

// 存储回调函数
const authCallbacks = []

// 1. 初始化：检查 Session
supabase.auth.getUser().then(({ data }) => {
    user.value = data.user
})

// 2. 监听 Supabase 状态变化 (自动处理 Token 刷新/过期)
supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user || null
})

// 3. 核心兼容逻辑：当状态变化时，触发所有注册的回调 (适配 App.vue 的逻辑)
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

    // ✅ 新增：注册功能
    const register = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            })
            if (error) throw error

            // 如果 Supabase 开启了邮箱验证但没配 SMTP，这里可能会提示需要验证
            // 如果关闭了 Confirm email，这里会直接登录成功
            if (data.user && !data.session) {
                return { success: true, message: '注册成功！请去邮箱确认验证链接，或直接登录。' }
            }

            return { success: true, user: data.user }
        } catch (error) {
            return { success: false, error: error.message || '注册失败' }
        }
    }

    // 兼容旧代码：提供 onAuthChange 方法
    const onAuthChange = (callback) => {
        if (typeof callback === 'function') {
            authCallbacks.push(callback)
        }
    }

    // 兼容旧代码：提供 apiRequest
    const apiRequest = async (url, options = {}) => {
        return fetch(url, options)
    }

    // 兼容旧代码
    const getAuthHeaders = () => ({})

    const checkAuth = async () => {
        const { data } = await supabase.auth.getUser()
        user.value = data.user
        return !!data.user
    }

    return {
        user,
        token,
        isAuthenticated,
        login,
        logout,
        register,      // 导出注册方法
        onAuthChange,  // 导出兼容监听方法
        getAuthHeaders,
        apiRequest,
        checkAuth
    }
}