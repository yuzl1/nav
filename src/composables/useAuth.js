// src/composables/useAuth.js
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabase'

// 使用全局状态，保证多组件共享
const user = ref(null)
const isAuthenticated = computed(() => !!user.value)

// 初始化时检查一次 Session
supabase.auth.getUser().then(({ data }) => {
    user.value = data.user
})

// 监听 Auth 状态变化（如 Token 过期、其他标签页登出）
supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user || null
})

export function useAuth() {

    const login = async (email, password) => {
        try {
            // Supabase 使用邮箱登录
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
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            user.value = null
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    // 这个函数主要是为了兼容旧代码结构，Supabase SDK 会自动处理 Header
    // 但我们在 RLS 策略中需要它
    const getAuthHeaders = () => {
        return {} // Supabase SDK 自动处理，不需要手动加 Header
    }

    // 这是一个辅助函数，用于需要手动验证登录状态的操作
    const checkAuth = async () => {
        const { data } = await supabase.auth.getUser()
        user.value = data.user
        return !!data.user
    }

    return {
        user,
        isAuthenticated,
        login,
        logout,
        getAuthHeaders,
        checkAuth
    }
}