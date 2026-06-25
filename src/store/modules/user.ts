import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LanguageEnum } from '@/enums/appEnum'
import { router } from '@/router'
import { useSettingStore } from './setting'
import { useWorktabStore } from './worktab'
import { AppRouteRecord } from '@/types/router'
import { setPageTitle } from '@/utils/router'

export const useUserStore = defineStore(
  'userStore',
  () => {
    const language = ref(LanguageEnum.ZH)
    const searchHistory = ref<AppRouteRecord[]>([])
    const isLock = ref(false)
    const lockPassword = ref('')
    const info = ref<Record<string, any> | null>(null)

    const getSettingState = computed(() => useSettingStore().$state)
    const getWorktabState = computed(() => useWorktabStore().$state)

    const setLanguage = (lang: LanguageEnum) => {
      setPageTitle(router.currentRoute.value)
      language.value = lang
    }

    const setSearchHistory = (list: AppRouteRecord[]) => {
      searchHistory.value = list
    }

    const setLockStatus = (status: boolean) => {
      isLock.value = status
    }

    const setLockPassword = (password: string) => {
      lockPassword.value = password
    }

    return {
      language,
      searchHistory,
      isLock,
      lockPassword,
      info,
      getSettingState,
      getWorktabState,
      setLanguage,
      setSearchHistory,
      setLockStatus,
      setLockPassword
    }
  },
  {
    persist: {
      key: 'user',
      storage: localStorage
    }
  }
)
