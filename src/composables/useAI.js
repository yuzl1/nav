// src/composables/useAI.js
import { ref } from 'vue'
import { useAuth } from './useAuth'
import { supabase } from '../utils/supabase'

// 状态管理
const aiEnabled = ref(false)
const aiSource = ref('custom') // 默认给一个值
const aiApiKey = ref('')
const aiBaseUrl = ref('https://api.openai.com/v1')
const aiModel = ref('gpt-4o-mini')

export function useAI() {
    const { isAuthenticated } = useAuth()

    // 内部加载函数
    const loadAISettings = async () => {
        if (!isAuthenticated.value) return

        const { data } = await supabase.from('settings').select('key, value')
            .in('key', ['aiApiKey', 'aiBaseUrl', 'aiModel'])

        if (data) {
            const map = {}
            data.forEach(i => map[i.key] = i.value)
            aiApiKey.value = map.aiApiKey || ''
            aiBaseUrl.value = map.aiBaseUrl || 'https://api.openai.com/v1'
            aiModel.value = map.aiModel || 'gpt-4o-mini'

            // 更新状态
            aiEnabled.value = !!aiApiKey.value
        }
    }

    // ✅ 恢复此函数：兼容 App.vue 的调用
    const checkAIAvailability = async () => {
        await loadAISettings()
        // 返回旧代码期望的格式
        return {
            success: true,
            enabled: aiEnabled.value,
            source: 'custom'
        }
    }

    const saveAISettings = async (settings) => {
        const updates = [
            { key: 'aiApiKey', value: settings.apiKey },
            { key: 'aiBaseUrl', value: settings.baseUrl },
            { key: 'aiModel', value: settings.model }
        ]
        const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' })
        if (!error) await loadAISettings()
        return { success: !error, error: error?.message }
    }

    const getAISettings = async () => {
        await loadAISettings()
        return {
            success: true,
            apiKey: aiApiKey.value,
            baseUrl: aiBaseUrl.value,
            model: aiModel.value,
            hasApiKey: !!aiApiKey.value
        }
    }

    // AI 调用逻辑
    const callAI = async (messages) => {
        if (!aiApiKey.value) return { success: false, error: '未配置 API Key' }

        try {
            const response = await fetch(`${aiBaseUrl.value}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiApiKey.value}`
                },
                body: JSON.stringify({
                    model: aiModel.value,
                    messages: messages,
                    temperature: 0.7
                })
            })
            const data = await response.json()
            if (data.error) throw new Error(data.error.message)
            return { success: true, content: data.choices[0].message.content }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }

    const generateDescription = async (name, url) => {
        await loadAISettings()
        const prompt = `请为以下网站生成一段简短的描述（50字以内）：\n网站名称：${name}\n网址：${url}`
        const res = await callAI([{ role: 'user', content: prompt }])
        if (res.success) return { success: true, description: res.content.trim() }
        return res
    }

    const suggestCategory = async (name, url, categories) => {
        await loadAISettings()
        const cats = JSON.stringify(categories)
        const prompt = `给定分类列表：${cats}。\n请根据网站 "${name}" (${url})，推荐最合适的一个分类ID。只返回分类ID数字，不要其他内容。`
        const res = await callAI([{ role: 'user', content: prompt }])
        const match = res.content?.match(/\d+/)
        if (res.success && match) return { success: true, categoryId: parseInt(match[0]) }
        return { success: false, error: '无法识别分类' }
    }

    return {
        aiEnabled, aiSource, aiApiKey, aiBaseUrl,
        checkAIAvailability, // ✅ 导出兼容函数
        loadAISettings,      // 新函数也导出备用
        saveAISettings,
        getAISettings,
        generateDescription,
        suggestCategory
    }
}