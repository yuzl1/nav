// src/composables/useSettings.js
import { ref, watch } from 'vue'
import { useAuth } from './useAuth'
import { supabase } from '../utils/supabase'

// 默认值保持不变
const showSearch = ref(localStorage.getItem('showSearch') !== 'false')
const hideEmptyCategories = ref(localStorage.getItem('hideEmptyCategories') === 'true')
const customTitle = ref(localStorage.getItem('customTitle') || '📚 书签管理')
const footerContent = ref(localStorage.getItem('footerContent') || '<p>Made with ❤️ using Vue 3 and Supabase</p>')
const activeSettingsTab = ref(localStorage.getItem('activeSettingsTab') || 'appearance')
const publicMode = ref(localStorage.getItem('publicMode') !== 'false')
const randomWallpaper = ref(localStorage.getItem('randomWallpaper') === 'true')
const wallpaperApi = ref(localStorage.getItem('wallpaperApi') || '')
const displayMode = ref(localStorage.getItem('displayMode') || 'standard')

const isLoadingFromDB = ref(false)

export function useSettings() {
    const { isAuthenticated } = useAuth()

    // 辅助函数：保存单个设置到 Supabase
    const saveSettingToDB = async (key, value) => {
        if (!isAuthenticated.value) return
        try {
            // 使用 upsert：如果 key 存在则更新，不存在则插入
            const { error } = await supabase
                .from('settings')
                .upsert({ key, value: String(value) }, { onConflict: 'key' })

            if (error) throw error
        } catch (error) {
            console.error(`Failed to save setting ${key}:`, error)
        }
    }

    // 从数据库加载所有设置
    const loadSettingsFromDB = async () => {
        isLoadingFromDB.value = true
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('key, value')

            if (error) throw error

            if (data) {
                // 将数组转换为对象映射
                const settingsMap = data.reduce((acc, curr) => {
                    acc[curr.key] = curr.value
                    return acc
                }, {})

                // 更新本地状态
                if (settingsMap.customTitle) customTitle.value = settingsMap.customTitle
                if (settingsMap.footerContent) footerContent.value = settingsMap.footerContent
                if (settingsMap.showSearch) showSearch.value = settingsMap.showSearch === 'true'
                if (settingsMap.hideEmptyCategories) hideEmptyCategories.value = settingsMap.hideEmptyCategories === 'true'
                if (settingsMap.publicMode) publicMode.value = settingsMap.publicMode === 'true'
                if (settingsMap.randomWallpaper) randomWallpaper.value = settingsMap.randomWallpaper === 'true'
                if (settingsMap.wallpaperApi) wallpaperApi.value = settingsMap.wallpaperApi
                if (settingsMap.displayMode) displayMode.value = settingsMap.displayMode

                // 同步到 LocalStorage
                Object.keys(settingsMap).forEach(key => {
                    localStorage.setItem(key, settingsMap[key])
                })
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        } finally {
            isLoadingFromDB.value = false
        }
    }

    // 各种 toggle 和 update 函数，改为调用 saveSettingToDB
    const toggleSearch = async () => {
        showSearch.value = !showSearch.value
        localStorage.setItem('showSearch', showSearch.value.toString())
        await saveSettingToDB('showSearch', showSearch.value)
    }

    const toggleHideEmptyCategories = async () => {
        hideEmptyCategories.value = !hideEmptyCategories.value
        localStorage.setItem('hideEmptyCategories', hideEmptyCategories.value.toString())
        await saveSettingToDB('hideEmptyCategories', hideEmptyCategories.value)
    }

    const updateCustomTitle = async (title) => {
        const newTitle = title || '📚 书签管理'
        customTitle.value = newTitle
        localStorage.setItem('customTitle', newTitle)
        await saveSettingToDB('customTitle', newTitle)
    }

    const updateFooterContent = async (content) => {
        const newContent = content || '<p>Made with ❤️ using Vue 3 and Supabase</p>'
        footerContent.value = newContent
        localStorage.setItem('footerContent', newContent)
        await saveSettingToDB('footerContent', newContent)
    }

    const setActiveSettingsTab = (tab) => {
        activeSettingsTab.value = tab
        localStorage.setItem('activeSettingsTab', tab)
        // 选项卡状态通常不需要存数据库，本地存即可
    }

    const togglePublicMode = async () => {
        publicMode.value = !publicMode.value
        localStorage.setItem('publicMode', publicMode.value.toString())
        await saveSettingToDB('publicMode', publicMode.value)
    }

    const toggleRandomWallpaper = async () => {
        randomWallpaper.value = !randomWallpaper.value
        localStorage.setItem('randomWallpaper', randomWallpaper.value.toString())
        await saveSettingToDB('randomWallpaper', randomWallpaper.value)
        if (randomWallpaper.value) applyWallpaper()
        else removeWallpaper()
    }

    const updateWallpaperApi = async (apiUrl) => {
        wallpaperApi.value = apiUrl || ''
        localStorage.setItem('wallpaperApi', wallpaperApi.value)
        await saveSettingToDB('wallpaperApi', wallpaperApi.value)
        if (randomWallpaper.value) applyWallpaper()
    }

    const setDisplayMode = async (mode) => {
        displayMode.value = mode
        localStorage.setItem('displayMode', mode)
        await saveSettingToDB('displayMode', mode)
    }

    // 壁纸相关逻辑保持不变（纯前端逻辑）
    const applyWallpaper = () => {
        if (!randomWallpaper.value || !wallpaperApi.value) {
            removeWallpaper()
            return
        }
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const apiUrl = `${wallpaperApi.value}${wallpaperApi.value.includes('?') ? '&' : '?'}_t=${Date.now()}`
        img.onload = () => {
            document.body.style.backgroundImage = `url(${img.src})`
            document.body.style.backgroundSize = 'cover'
            document.body.style.backgroundPosition = 'center'
            document.body.style.backgroundRepeat = 'no-repeat'
            document.body.style.backgroundAttachment = 'fixed'
            document.body.classList.add('has-wallpaper')
        }
        img.src = apiUrl
    }

    const removeWallpaper = () => {
        document.body.style.backgroundImage = ''
        document.body.classList.remove('has-wallpaper')
    }

    return {
        showSearch,
        hideEmptyCategories,
        customTitle,
        footerContent,
        activeSettingsTab,
        publicMode,
        randomWallpaper,
        wallpaperApi,
        displayMode,
        toggleSearch,
        toggleHideEmptyCategories,
        updateCustomTitle,
        updateFooterContent,
        setActiveSettingsTab,
        togglePublicMode,
        toggleRandomWallpaper,
        updateWallpaperApi,
        setDisplayMode,
        applyWallpaper,
        removeWallpaper,
        loadSettingsFromDB
    }
}