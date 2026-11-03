<script setup lang="ts">
import type { BlendMode } from '@open-pencil/scene-graph'
import { POINT_COUNT_RANGE } from '@open-pencil/scene-graph/polygon'
import { MIXED } from '@open-pencil/vue/controls/node-props'
import { useVariableModes } from '@open-pencil/vue/controls/variable-modes'
import { useI18n } from '@open-pencil/vue/i18n'
import { AppearanceControlsRoot } from '@open-pencil/vue/primitives/AppearanceControls'

import { OpacityIcon } from '@/components/icons/paint'
import { CornerRadiusIcon } from '@/components/icons/transform'
import { useBlendModeGroups } from '@/components/inputs/blend-mode'
import NumberField from '@/components/inputs/NumberField.vue'
import ClipContentControl from '@/components/properties/layout/ClipContentControl.vue'
import VariableNumberField from '@/components/properties/VariableNumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

import VariableBoundRow from './binding/VariableBoundRow.vue'
import PropertyBoundField from './component-properties/PropertyBoundField.vue'
import VariableModeMenu from './variable-modes/VariableModeMenu.vue'
import VariableModeRows from './variable-modes/VariableModeRows.vue'
import VisibilityControl from './visibility/VisibilityControl.vue'

const { panels } = useI18n()
const { compact = false } = defineProps<{ compact?: boolean }>()
const variableModes = useVariableModes()
type BlendModeSelectValue = BlendMode | 'MIXED'

const baseBlendModeGroups = useBlendModeGroups(true)
const cornerFields = [
  { key: 'topLeftRadius', label: 'TL', rotation: '' },
  { key: 'topRightRadius', label: 'TR', rotation: 'rotate-90' },
  { key: 'bottomLeftRadius', label: 'BL', rotation: '-rotate-90' },
  { key: 'bottomRightRadius', label: 'BR', rotation: 'rotate-180' }
] as const

function blendModeGroups(value: BlendMode | typeof MIXED) {
  return value === MIXED
    ? [
        { options: [{ value: 'MIXED' as const, label: panels.value.mixed }] },
        ...baseBlendModeGroups.value
      ]
    : baseBlendModeGroups.value
}
</script>

<template>
  <AppearanceControlsRoot
    :corner-expansion="compact ? 'manual' : 'selection'"
    v-slot="{
      node,
      isMulti,
      active,
      hasCornerRadius,
      cornerRadiusDisabled,
      splitsCorners,
      hasPointCount,
      hasStarRatio,
      pointCount,
      starRatioPercent,
      showIndependentCorners,
      cornerNodeIds,
      cornerRadiusValues,
      cornerRadiusValue,
      cornerRadiusBindingPaths,
      cornerSmoothingPercent,
      opacityPercent,
      blendModeValue,
      visibilityState,
      actions
    }"
  >
    <PanelSection v-if="active" :label="panels.appearance">
      <template #actions>
        <VariableModeMenu :choices="variableModes.choices.value" @set="variableModes.setMode" />
        <VisibilityControl
          :node-id="node && !isMulti ? node.id : undefined"
          :visibility="visibilityState"
          @toggle="actions.toggleVisibility"
        />
      </template>
      <PropertyBoundField field="VISIBLE" />
      <VariableBoundRow
        v-if="node && !isMulti"
        :node-id="node.id"
        field="VISIBLE"
        :label="panels.layerVisibility"
      />

      <PanelGrid
        :key="`appearance:${JSON.stringify(cornerNodeIds)}`"
        :columns="2"
        :distribution="compact ? 'equal' : 'wide-first'"
      >
        <PanelFieldGroup v-if="!compact" :label="panels.blendMode">
          <AppSelect
            :model-value="blendModeValue === MIXED ? 'MIXED' : blendModeValue"
            class="w-full"
            :label="panels.blendMode"
            :groups="blendModeGroups(blendModeValue)"
            @update:model-value="
              (value: BlendModeSelectValue) => value !== 'MIXED' && actions.setBlendMode(value)
            "
          />
        </PanelFieldGroup>

        <PanelFieldGroup
          :label="compact ? undefined : panels.opacity"
          :ui="{
            container: compact ? 'flex-row items-center gap-0 rounded bg-panel-field' : undefined
          }"
        >
          <VariableNumberField
            v-if="node && !isMulti"
            :compact="compact"
            :suffix="compact ? undefined : '%'"
            :aria-label="panels.opacity"
            :model-value="opacityPercent"
            :min="0"
            :max="100"
            :node-id="node.id"
            binding-path="opacity"
            @update:model-value="actions.updateProp('opacity', $event / 100)"
            @commit="(v: number, p: number) => actions.commitProp('opacity', v / 100, p / 100)"
          >
            <template #icon>
              <OpacityIcon v-if="compact" class="size-4" />
              <icon-lucide-blend v-else class="size-3" />
            </template>
          </VariableNumberField>
          <NumberField
            v-else
            :suffix="compact ? undefined : '%'"
            data-property="opacity"
            :aria-label="panels.opacity"
            :model-value="opacityPercent"
            :min="0"
            :max="100"
            @update:model-value="actions.updateProp('opacity', $event / 100)"
            @commit="(v: number, p: number) => actions.commitProp('opacity', v / 100, p / 100)"
          >
            <template #icon>
              <OpacityIcon v-if="compact" class="size-4" />
              <icon-lucide-blend v-else class="size-3" />
            </template>
          </NumberField>
        </PanelFieldGroup>
        <VariableNumberField
          v-if="compact && hasCornerRadius && node && !isMulti && !cornerRadiusDisabled"
          compact
          :aria-label="panels.radius"
          :model-value="cornerRadiusValue"
          :min="0"
          :node-id="node.id"
          binding-path="cornerRadius"
          :binding-paths="cornerRadiusBindingPaths"
          @update:model-value="actions.updateUniformRadius"
          @commit="actions.commitUniformRadius"
          @cancel="actions.cancelRadiusPreview"
          @before-cancel="actions.rollbackRadiusPreview"
          ><template #icon><icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" /></template
        ></VariableNumberField>
        <NumberField
          v-else-if="compact && hasCornerRadius"
          data-property="cornerRadius"
          :aria-label="panels.radius"
          :model-value="cornerRadiusValue"
          :disabled="cornerRadiusDisabled"
          :min="0"
          @update:model-value="actions.updateUniformRadius"
          @commit="actions.commitUniformRadius"
          @cancel="actions.cancelRadiusPreview"
          ><template #icon><icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" /></template
        ></NumberField>
        <template v-if="compact && splitsCorners" #actions
          ><IconButton
            :label="panels.independentCornerRadii"
            size="xs"
            :active="showIndependentCorners"
            :disabled="cornerRadiusDisabled"
            @click="actions.toggleIndependentCorners"
            ><icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" /></IconButton
        ></template>
      </PanelGrid>

      <PanelGrid
        v-if="!compact && hasCornerRadius && !showIndependentCorners"
        :key="`uniform:${JSON.stringify(cornerNodeIds)}`"
        :columns="2"
        class="mt-1.5"
      >
        <PanelFieldGroup :label="panels.radius">
          <VariableNumberField
            v-if="node && !isMulti && !cornerRadiusDisabled"
            :aria-label="panels.radius"
            :model-value="cornerRadiusValue"
            :min="0"
            :node-id="node.id"
            binding-path="cornerRadius"
            :binding-paths="cornerRadiusBindingPaths"
            @update:model-value="actions.updateUniformRadius"
            @commit="actions.commitUniformRadius"
            @cancel="actions.cancelRadiusPreview"
            @before-cancel="actions.rollbackRadiusPreview"
          >
            <template #icon>
              <icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" />
            </template>
          </VariableNumberField>
          <NumberField
            v-else
            data-property="cornerRadius"
            :aria-label="panels.radius"
            :model-value="cornerRadiusValue"
            :disabled="cornerRadiusDisabled"
            :min="0"
            @update:model-value="actions.updateUniformRadius"
            @commit="actions.commitUniformRadius"
            @cancel="actions.cancelRadiusPreview"
          >
            <template #icon>
              <icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" />
            </template>
          </NumberField>
        </PanelFieldGroup>
        <div v-if="splitsCorners" class="flex h-6 items-center justify-end">
          <IconButton
            :label="panels.independentCornerRadii"
            size="xs"
            :active="showIndependentCorners"
            :disabled="cornerRadiusDisabled"
            @click="actions.toggleIndependentCorners"
          >
            <icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" />
          </IconButton>
        </div>
      </PanelGrid>

      <PanelGrid
        v-else-if="hasCornerRadius && showIndependentCorners && cornerNodeIds[0]"
        :key="`corners:${JSON.stringify(cornerNodeIds)}`"
        :columns="2"
        class="mt-1.5 [&>[data-slot=actions]]:self-start"
        data-corner-grid
      >
        <VariableNumberField
          v-for="corner in cornerFields"
          :key="corner.key"
          :aria-label="corner.label"
          :compact="compact"
          :model-value="cornerRadiusValues[corner.key]"
          :min="0"
          :node-id="cornerNodeIds[0]"
          :node-ids="cornerNodeIds"
          :binding-path="corner.key"
          @update:model-value="actions.updateCornerProp(corner.key, $event)"
          @commit="(v: number, p: number) => actions.commitCornerProp(corner.key, v, p)"
          @cancel="actions.cancelRadiusPreview"
          @before-cancel="actions.rollbackRadiusPreview"
        >
          <template #icon><CornerRadiusIcon :class="['size-4', corner.rotation]" /></template>
        </VariableNumberField>
        <template v-if="!compact" #actions>
          <IconButton
            :label="panels.independentCornerRadii"
            size="xs"
            active
            @click="actions.toggleIndependentCorners"
          >
            <icon-lucide-scan class="size-4 [&_*]:stroke-[1.5]" />
          </IconButton>
        </template>
      </PanelGrid>

      <PanelGrid v-if="hasPointCount" :columns="2" class="mt-1.5">
        <PanelFieldGroup :label="panels.pointCount">
          <NumberField
            :model-value="pointCount"
            :min="POINT_COUNT_RANGE.min"
            :max="POINT_COUNT_RANGE.max"
            :aria-label="panels.pointCount"
            data-property="pointCount"
            @update:model-value="actions.updateProp('pointCount', Math.round($event))"
            @commit="(v: number, p: number) => actions.commitProp('pointCount', Math.round(v), p)"
          >
            <template #icon>
              <icon-lucide-asterisk class="size-3" />
            </template>
          </NumberField>
        </PanelFieldGroup>
        <PanelFieldGroup v-if="hasStarRatio" :label="panels.starRatio">
          <NumberField
            suffix="%"
            :model-value="starRatioPercent"
            :min="0"
            :max="100"
            :step="0.1"
            :aria-label="panels.starRatio"
            data-property="starInnerRadius"
            @update:model-value="actions.updateProp('starInnerRadius', $event / 100)"
            @commit="
              (v: number, p: number) => actions.commitProp('starInnerRadius', v / 100, p / 100)
            "
          >
            <template #icon>
              <icon-lucide-star class="size-3" />
            </template>
          </NumberField>
        </PanelFieldGroup>
      </PanelGrid>

      <PanelGrid
        v-if="
          hasCornerRadius && !cornerRadiusDisabled && (!compact || cornerSmoothingPercent !== 0)
        "
        :columns="2"
        class="mt-1.5"
      >
        <PanelFieldGroup :label="panels.cornerSmoothing">
          <NumberField
            suffix="%"
            :model-value="cornerSmoothingPercent"
            :min="0"
            :max="100"
            :aria-label="panels.cornerSmoothing"
            data-property="corner-smoothing"
            @update:model-value="actions.updateCornerProp('cornerSmoothing', $event / 100)"
            @commit="
              (v: number, p: number) =>
                actions.commitCornerProp('cornerSmoothing', v / 100, p / 100)
            "
            @cancel="actions.cancelRadiusPreview"
          >
            <template #icon>
              <icon-lucide-squircle class="size-3" />
            </template>
          </NumberField>
        </PanelFieldGroup>
      </PanelGrid>

      <VariableModeRows :choices="variableModes.applied.value" @set="variableModes.setMode" />
      <ClipContentControl v-if="compact" />
    </PanelSection>
  </AppearanceControlsRoot>
</template>
