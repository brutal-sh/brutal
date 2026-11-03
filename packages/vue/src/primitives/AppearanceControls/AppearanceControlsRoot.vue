<script setup lang="ts">
import { useAppearance } from '#vue/controls/appearance/use'
import type {
  AppearanceControlsRootProps,
  AppearanceControlsRootSlots
} from '#vue/primitives/AppearanceControls/types'

const { cornerExpansion = 'selection' } = defineProps<AppearanceControlsRootProps>()
const ctx = useAppearance({ cornerExpansion: () => cornerExpansion })
defineSlots<AppearanceControlsRootSlots>()
const actions = {
  updateProp: ctx.updateProp,
  commitProp: ctx.commitProp,
  setBlendMode: ctx.setBlendMode,
  toggleVisibility: ctx.toggleVisibility,
  toggleIndependentCorners: ctx.toggleIndependentCorners,
  updateUniformRadius: ctx.updateUniformRadius,
  commitUniformRadius: ctx.commitUniformRadius,
  updateCornerProp: ctx.updateCornerProp,
  commitCornerProp: ctx.commitCornerProp,
  cancelRadiusPreview: ctx.cancelRadiusPreview,
  rollbackRadiusPreview: ctx.rollbackRadiusPreview
}
</script>

<template>
  <slot
    :node="ctx.node.value"
    :is-multi="ctx.isMulti.value"
    :active="ctx.active.value"
    :has-corner-radius="ctx.hasCornerRadius.value"
    :corner-radius-disabled="ctx.cornerRadiusDisabled.value"
    :splits-corners="ctx.splitsCorners.value"
    :has-point-count="ctx.hasPointCount.value"
    :has-star-ratio="ctx.hasStarRatio.value"
    :point-count="ctx.pointCount.value"
    :star-ratio-percent="ctx.starRatioPercent.value"
    :independent-corners="ctx.independentCorners.value"
    :show-independent-corners="ctx.showIndependentCorners.value"
    :corner-node-ids="ctx.cornerNodeIds.value"
    :corner-radius-values="ctx.cornerRadiusValues.value"
    :corner-radius-value="ctx.cornerRadiusValue.value"
    :corner-radius-binding-paths="ctx.cornerRadiusBindingPaths.value"
    :corner-smoothing-percent="ctx.cornerSmoothingPercent.value"
    :opacity-percent="ctx.opacityPercent.value"
    :blend-mode-value="ctx.blendModeValue.value"
    :visibility-state="ctx.visibilityState.value"
    :actions="actions"
  />
</template>
