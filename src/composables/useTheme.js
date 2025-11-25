// src/composables/useTheme.js
import { ref, watch } from 'vue'
import { useAuth } from './useAuth'
import { supabase } from '../utils/supabase'

const themeMode = ref(localStorage.getItem('themeMode') || 'system')
const themeStyle = ref(localStorage.getItem('themeStyle') || 'default')
const isDark = ref(false)

const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const applyTheme = () => {
    const currentTheme = themeMode.value === 'system' ? getSystemTheme() : themeMode.value
    isDark.value = currentTheme === 'dark'

    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(isDark.value ? 'dark' : 'light')

    document.documentElement.classList.remove('style-default', 'style-ios26')
    document.documentElement.classList.add(`style-${themeStyle.value}`)
}

export function useTheme() {
    const { isAuthenticated } = useAuth()

    const saveThemeToDB = async () => {
        if (!isAuthenticated.value) return
        try {
            // 批量更新设置
            await supabase.from('settings').upsert([
                { key: 'themeMode', value: themeMode.value },
                { key: 'themeStyle', value: themeStyle.value }
            ], { onConflict: 'key' })
        } catch (error) {
            console.error('Failed to save theme:', error)
        }
    }

    // 加载逻辑通常由 useSettings.js 统一处理，但这里保留独立加载也可以
    const loadThemeFromDB = async () => {
        try {
            const { data } = await supabase.from('settings').select('key, value').in('key', ['themeMode', 'themeStyle'])
            if (data) {
                data.forEach(item => {
                    if (item.key === 'themeMode') themeMode.value = item.value
                    if (item.key === 'themeStyle') themeStyle.value = item.value
                })
                applyTheme()
            }
        } catch (error) {
            console.error('Failed to load theme:', error)
        }
    }

    const setThemeMode = async (mode) => {
        themeMode.value = mode
        localStorage.setItem('themeMode', mode)
        applyTheme()
        await saveThemeToDB()
    }

    const setThemeStyle = async (style) => {
        themeStyle.value = style
        localStorage.setItem('themeStyle', style)
        applyTheme()
        await saveThemeToDB()
    }

    const toggleTheme = async () => {
        const modes = ['light', 'dark', 'system']
        const nextIndex = (modes.indexOf(themeMode.value) + 1) % modes.length
        await setThemeMode(modes[nextIndex])
    }

    watch([themeMode, themeStyle], applyTheme, { immediate: true })

    if (typeof window !== 'undefined') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (themeMode.value === 'system') applyTheme()
        })
    }

    return { themeMode, themeStyle, isDark, setThemeMode, setThemeStyle, toggleTheme, loadThemeFromDB }
}