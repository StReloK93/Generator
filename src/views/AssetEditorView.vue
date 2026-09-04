<template>
  <div class="flex flex-col h-dvh min-h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    
    <!-- ================= TOP HEADER TOOLBAR ================= -->
    <header class="h-14 bg-slate-900/95 border-b border-slate-800/80 px-4 flex items-center justify-between gap-3 shrink-0 z-30 backdrop-blur-xl">
      
      <!-- Left: Back Button & Title -->
      <div class="flex items-center gap-3 min-w-0">
        <UiButton 
          variant="secondary" 
          size="sm" 
          :leading-icon="ArrowLeft" 
          @click="handleBackToHome"
        >
          <span class="hidden sm:inline">Home</span>
        </UiButton>

        <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <Wrench class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="font-black text-xs sm:text-sm text-white tracking-wide truncate">
                Asset Editor (Studio)
              </h1>
              <UiBadge variant="amber" size="xs">
                BETA
              </UiBadge>
            </div>
            <p class="text-[10px] text-slate-400 truncate hidden md:block">
              Compose custom isometric sprites, towers, and objects
            </p>
          </div>
        </div>
      </div>

      <!-- Middle: Asset Name & Undo/Redo -->
      <div class="flex items-center gap-2 max-w-xs sm:max-w-sm w-full mx-2">
        <UiInput 
          v-model="store.assetName"
          size="sm"
          placeholder="Asset name..."
          :leading-icon="FileText"
        />

        <div class="flex items-center gap-1 shrink-0">
          <UiIconButton 
            :icon="Undo2" 
            size="sm" 
            variant="ghost" 
            :disabled="store.historyIndex <= 0"
            title="Undo (Ctrl+Z)" 
            @click="store.undo()" 
          />
          <UiIconButton 
            :icon="Redo2" 
            size="sm" 
            variant="ghost" 
            :disabled="store.historyIndex >= store.history.length - 1"
            title="Redo (Ctrl+Shift+Z)" 
            @click="store.redo()" 
          />
        </div>
      </div>

      <!-- Right: Export & Save Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Save to Game Project Assets -->
        <UiButton 
          variant="game-amber" 
          size="sm" 
          :leading-icon="Sparkles"
          :disabled="store.parts.length === 0"
          @click="handleSaveToProject"
        >
          <span class="hidden sm:inline">Add to Library</span>
          <span class="sm:hidden">Add</span>
        </UiButton>

        <!-- Download Transparent PNG -->
        <UiButton 
          variant="game-green" 
          size="sm" 
          :leading-icon="Download"
          :disabled="store.parts.length === 0"
          @click="handleDownloadPng"
        >
          <span class="hidden md:inline">Download Transparent PNG</span>
          <span class="md:hidden">PNG</span>
        </UiButton>
      </div>

    </header>


    <!-- ================= MAIN WORKSPACE (3-COLUMN LAYOUT) ================= -->
    <div class="flex-1 flex overflow-hidden relative">
      
      <!-- 1. LEFT: Sprite Gallery Sidebar -->
      <AssetGallerySidebar />

      <!-- 2. CENTER: Interactive Composition Canvas -->
      <main class="flex-1 h-full relative overflow-hidden bg-slate-950 flex flex-col">
        <AssetCanvas ref="canvasComponentRef" />
      </main>

      <!-- 3. RIGHT: Inspector & Layers Panel -->
      <aside class="flex flex-col h-full w-80 sm:w-96 bg-slate-900/90 border-l border-slate-800/80 backdrop-blur-xl shrink-0 p-3 overflow-hidden select-none">
        
        <!-- Right Navigation Tabs -->
        <UiTabs 
          v-model="rightActiveTab"
          :items="[
            { id: 'layers', label: 'Layers', icon: Layers, count: store.parts.length },
            { id: 'transform', label: 'Nudge & Transform', icon: Move },
          ]"
          fill
          size="sm"
          custom-class="mb-3"
        />

        <!-- Tab 1: Layers List -->
        <div v-show="rightActiveTab === 'layers'" class="flex-1 min-h-0">
          <AssetLayersPanel />
        </div>

        <!-- Tab 2: Nudge & Transform Controls -->
        <div v-show="rightActiveTab === 'transform'" class="flex-1 min-h-0">
          <AssetNudgeControls />
        </div>

      </aside>

    </div>

    <!-- Notification Toast / Modal -->
    <div 
      v-if="toastMessage" 
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl shadow-emerald-500/30 border border-emerald-400 animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2"
    >
      <CheckCircle2 class="w-4 h-4" />
      <span>{{ toastMessage }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Wrench, 
  FileText, 
  Undo2, 
  Redo2, 
  Download, 
  Sparkles, 
  Layers, 
  Move, 
  CheckCircle2 
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiInput, UiBadge, UiTabs } from '../components/ui'
import AssetCanvas from '../components/asset-editor/AssetCanvas.vue'
import AssetGallerySidebar from '../components/asset-editor/AssetGallerySidebar.vue'
import AssetLayersPanel from '../components/asset-editor/AssetLayersPanel.vue'
import AssetNudgeControls from '../components/asset-editor/AssetNudgeControls.vue'
import { useAssetEditorStore } from '../stores/assetEditorStore'
import { useAssetStore } from '../stores/assetStore'
import { assetManager } from '../services/assetManager'

const router = useRouter()
const store = useAssetEditorStore()
const assetStore = useAssetStore()

const canvasComponentRef = ref<any>(null)
const rightActiveTab = ref<'layers' | 'transform'>('layers')
const toastMessage = ref('')

onMounted(async () => {
  try {
    await assetManager.loadEditor()
    await assetManager.loadGame()
  } catch (e) {
    console.warn('[AssetEditorView] Failed to load asset bundles:', e)
  }
})

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

function handleBackToHome() {
  router.push('/')
}

async function handleDownloadPng() {
  if (!canvasComponentRef.value) return

  try {
    const { dataUrl } = await canvasComponentRef.value.exportToTransparentBlob()
    const link = document.createElement('a')
    const cleanName = (store.assetName.trim() || 'custom_asset').replace(/\s+/g, '_').toLowerCase()
    link.download = `${cleanName}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`"${cleanName}.png" downloaded successfully!`)
  } catch (err) {
    console.error('Export error:', err)
  }
}

async function handleSaveToProject() {
  if (!canvasComponentRef.value) return

  try {
    const { dataUrl, width, height } = await canvasComponentRef.value.exportToTransparentBlob()
    const cleanName = (store.assetName.trim() || 'Custom Asset').replace(/_/g, ' ')
    const assetId = `custom-asset-${Date.now()}`

    // Add to project assetStore
    assetStore.addCustomAsset({
      id: assetId,
      name: cleanName,
      fileRelativePath: `${assetId}.png`,
      category: 'Custom',
      src: dataUrl,
      previewSrc: dataUrl,
      width,
      height,
      anchorX: 0.5,
      anchorY: 0.88,
      spanX: 1,
      spanY: 1,
      scale: 1.0,
    })

    showToast(`"${cleanName}" added to map editor library!`)
  } catch (err) {
    console.error('Save to project error:', err)
  }
}
</script>
