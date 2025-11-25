// src/composables/useAI.js
import { ref } from 'vue'
import { useAuth } from './useAuth'
import { supabase } from '../utils/supabase'

// 这些状态从 settings 表加载
const aiEnabled = ref(false)
const aiApiKey = ref('')
const aiBaseUrl = ref('https://api.openai.com/v1')
const aiModel = ref('gpt-4o-mini')

export function useAI() {
    const { isAuthenticated } = useAuth()

    // 加载 AI 设置
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
            aiEnabled.value = !!aiApiKey.value
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

    // 通用 AI 调用函数 (直接在浏览器发起)
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
        // 解析返回的 ID
        if (res.success) return { success: true, categoryId: parseInt(res.content.match(/\d+/)[0]) }
        return res
    }

    return {
        aiEnabled, aiApiKey, aiBaseUrl,
        loadAISettings, saveAISettings,
        generateDescription, suggestCategory
    }
}