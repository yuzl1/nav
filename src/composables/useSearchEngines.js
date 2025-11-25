// src/composables/useSearchEngines.js
import { ref, watch } from 'vue'
import { useAuth } from './useAuth'
import { supabase } from '../utils/supabase'

const SEARCH_ENGINES = [
    {
        id: 'google',
        name: 'Google',
        icon: 'https://www.faviconextractor.com/favicon/www.google.com',
        url: 'https://www.google.com/search?q='
    },
    {
        id: 'bing',
        name: 'Bing',
        icon: 'https://www.faviconextractor.com/favicon/www.bing.com',
        url: 'https://www.bing.com/search?q='
    },
    {
        id: 'baidu',
        name: '百度',
        icon: 'https://www.faviconextractor.com/favicon/www.baidu.com',
        url: 'https://www.baidu.com/s?wd='
    },
    {
        id: 'duckduckgo',
        name: 'DuckDuckGo',
        icon: 'https://www.faviconextractor.com/favicon/duckduckgo.com',
        url: 'https://duckduckgo.com/?q='
    },
    {
        id: 'github',
        name: 'GitHub',
        icon: 'https://www.faviconextractor.com/favicon/github.com',
        url: 'https://github.com/search?q='
    },
    {
        id: 'stackoverflow',
        name: 'Stack Overflow',
        icon: 'https://www.faviconextractor.com/favicon/stackoverflow.com',
        url: 'https://stackoverflow.com/search?q='
    },
    {
        id: 'wikipedia',
        name: 'Wikipedia',
        icon: 'https://www.faviconextractor.com/favicon/en.wikipedia.org',
        url: 'https://en.wikipedia.org/w/index.php?search='
    },
    {
        id: 'npm',
        name: 'NPM',
        icon: 'https://www.faviconextractor.com/favicon/www.npmjs.com',
        url: 'https://www.npmjs.com/search?q='
    }
]

const enabledEngines = ref(localStorage.getItem('enabledSearchEngines')
    ? JSON.parse(localStorage.getItem('enabledSearchEngines'))
    : SEARCH_ENGINES.slice(0, 4).map(e => e.id))

const enabledSearchEnginesPanel = ref(localStorage.getItem('enabledSearchEnginesPanel') !== 'false')

const isLoadingFromDB = ref(false)

export function useSearchEngines() {
    const { isAuthenticated } = useAuth()

    // 辅助函数：保存设置到 Supabase
    const saveSettingToDB = async (key, value) => {
        if (!isAuthenticated.value) return
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key, value: String(value) }, { onConflict: 'key' })

            if (error) throw error
        } catch (error) {
            console.error(`Failed to save search engine setting ${key}:`, error)
        }
    }

    const getAvailableEngines = () => {
        return SEARCH_ENGINES.filter(engine => enabledEngines.value.includes(engine.id))
    }

    const getEngineUrl = (engineId, query) => {
        const engine = SEARCH_ENGINES.find(e => e.id === engineId)
        if (!engine) return null
        return engine.url + encodeURIComponent(query)
    }

    const openSearchEngine = (engineId, query) => {
        const url = getEngineUrl(engineId, query)
        if (url) {
            window.open(url, '_blank')
        }
    }

    const toggleEngine = async (engineId) => {
        const index = enabledEngines.value.indexOf(engineId)
        if (index > -1) {
            enabledEngines.value.splice(index, 1)
        } else {
            enabledEngines.value.push(engineId)
        }

        const valueStr = JSON.stringify(enabledEngines.value)
        localStorage.setItem('enabledSearchEngines', valueStr)
        await saveSettingToDB('enabledSearchEngines', valueStr)
    }

    const toggleSearchEnginesPanel = async () => {
        enabledSearchEnginesPanel.value = !enabledSearchEnginesPanel.value
        const valueStr = String(enabledSearchEnginesPanel.value)
        localStorage.setItem('enabledSearchEnginesPanel', valueStr)
        await saveSettingToDB('enabledSearchEnginesPanel', valueStr)
    }

    const loadSettingsFromDB = async () => {
        isLoadingFromDB.value = true
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', ['enabledSearchEngines', 'enabledSearchEnginesPanel'])

            if (error) throw error

            if (data) {
                data.forEach(item => {
                    if (item.key === 'enabledSearchEngines') {
                        try {
                            enabledEngines.value = JSON.parse(item.value)
                            localStorage.setItem('enabledSearchEngines', item.value)
                        } catch (e) {
                            console.error('Parse enabledSearchEngines failed', e)
                        }
                    }
                    if (item.key === 'enabledSearchEnginesPanel') {
                        enabledSearchEnginesPanel.value = item.value !== 'false'
                        localStorage.setItem('enabledSearchEnginesPanel', item.value)
                    }
                })
            }
        } catch (error) {
            console.error('Failed to load search engines settings:', error)
        } finally {
            isLoadingFromDB.value = false
        }
    }

    // 监听变化自动保存
    watch(enabledEngines, async (newValue) => {
        if (!isLoadingFromDB.value && isAuthenticated.value) {
            await saveSettingToDB('enabledSearchEngines', JSON.stringify(newValue))
        }
    }, { deep: true })

    return {
        SEARCH_ENGINES,
        enabledEngines,
        enabledSearchEnginesPanel,
        getAvailableEngines,
        getEngineUrl,
        openSearchEngine,
        toggleEngine,
        toggleSearchEnginesPanel,
        loadSettingsFromDB
    }
}