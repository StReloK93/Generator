<template>
  <UiModal
    :is-open="admin.isLoginOpen"
    :title="$t('admin.title')"
    :subtitle="$t('admin.subtitle')"
    :icon="ShieldCheck"
    icon-color="amber"
    size="sm"
    :teleport="true"
    stacked
    @close="admin.isLoginOpen = false"
  >
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <UiInput v-model="name" :label="$t('admin.login')" :leading-icon="User" size="md" />
      <UiInput v-model="password" type="password" :label="$t('admin.password')" :leading-icon="Lock" size="md" />
      <p v-if="admin.error" class="flex items-center gap-2 text-xs text-rose-300">
        <AlertTriangle class="size-4 shrink-0" />
        {{ $t(`admin.error.${admin.error}`) }}
      </p>
      <UiButton type="submit" variant="game-amber" size="md" block :leading-icon="LogIn" :loading="admin.isBusy" :disabled="!name || !password">
        {{ $t('admin.submit') }}
      </UiButton>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlertTriangle, Lock, LogIn, ShieldCheck, User } from 'lucide-vue-next'
import { UiButton, UiInput, UiModal } from './ui'
import { useAdminStore } from '../stores/adminStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18nStore } from '../stores/i18nStore'

/** Admin sign-in: the login and password from the server's .env (ADMIN_LOGIN / ADMIN_PASSWORD) */
const admin = useAdminStore()
const notify = useNotificationStore()
const { t } = useI18nStore()

const name = ref('')
const password = ref('')
watch(() => admin.isLoginOpen, open => {
  if (open) password.value = ''
})

async function submit() {
  if (await admin.signIn(name.value.trim(), password.value)) notify.success(t('admin.signedIn', { name: admin.login }))
}
</script>
