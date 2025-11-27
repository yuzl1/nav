<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="dialog-overlay" @click="close">
        <div class="dialog-box login-modal" @click.stop>
          <h3 class="dialog-title">{{ isRegister ? '注册新账号' : '登录' }}</h3>

          <div class="form-group">
            <label>邮箱</label>
            <input
                v-model="username"
                type="email"
                placeholder="请输入邮箱"
                @keyup.enter="handleSubmit"
            >
          </div>

          <div class="form-group">
            <label>密码</label>
            <input
                v-model="password"
                type="password"
                placeholder="请输入密码 (至少6位)"
                @keyup.enter="handleSubmit"
            >
          </div>

          <div v-if="isRegister" class="form-group">
            <label>确认密码</label>
            <input
                v-model="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                @keyup.enter="handleSubmit"
            >
          </div>

          <div v-if="!isRegister" class="form-group">
            <label class="remember-me-label">
              <input v-model="rememberMe" type="checkbox">
              <span>记住我</span>
            </label>
          </div>

          <p v-if="error" class="error-message">{{ error }}</p>
          <p v-if="successMsg" class="success-message">{{ successMsg }}</p>

          <div class="dialog-buttons">
            <button class="btn-text" @click="toggleMode">
              {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
            </button>

            <div class="action-buttons">
              <button class="btn btn-secondary" @click="close">取消</button>
              <button class="btn btn-primary" @click="handleSubmit">
                {{ isRegister ? '注册' : '登录' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { login, register } = useAuth()

const show = ref(false)
const isRegister = ref(false) // 控制模式
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(true) // 默认记住
const error = ref('')
const successMsg = ref('')

const open = () => {
  show.value = true
  resetForm()
}

const close = () => {
  show.value = false
}

const resetForm = () => {
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  successMsg.value = ''
  isRegister.value = false
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
  error.value = ''
  successMsg.value = ''
}

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入邮箱和密码'
    return
  }

  if (isRegister.value) {
    // === 注册逻辑 ===
    if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致'
      return
    }
    if (password.value.length < 6) {
      error.value = '密码长度不能少于6位'
      return
    }

    const result = await register(username.value, password.value)
    if (result.success) {
      if (result.message) {
        // 需要邮箱验证的情况
        successMsg.value = result.message
      } else {
        // 注册成功直接登录
        close()
      }
    } else {
      error.value = result.error
    }

  } else {
    // === 登录逻辑 ===
    const result = await login(username.value, password.value)
    if (result.success) {
      close()
    } else {
      error.value = result.error || '登录失败，请检查账号密码'
    }
  }
}

defineExpose({ open, close })
</script>

<style scoped>
.remember-me-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.remember-me-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.remember-me-label span {
  font-size: 0.95rem;
  color: var(--text);
  font-weight: 500;
  user-select: none;
}

.remember-me-label:hover span {
  color: var(--primary);
}

.dialog-buttons {
  display: flex;
  justify-content: space-between; /* 让切换按钮在左，操作按钮在右 */
  align-items: center;
  margin-top: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.btn-text:hover {
  color: var(--primary-dark);
}

.success-message {
  color: #10b981;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
}
</style>