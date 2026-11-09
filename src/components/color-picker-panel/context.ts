import { useLocalStorage } from '@vueuse/core'
import { computed, inject, onScopeDispose, provide, proxyRefs, ref, watch } from 'vue'
import type { InjectionKey, ShallowUnwrapRef } from 'vue'

import { colorToCSS, colorToCSSRGBA, tryParseColor } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useColorModel, type OkHCLControls } from '@open-pencil/vue/controls/color-model'
import { useI18n } from '@open-pencil/vue/i18n'

import { canSampleScreenColor, sampleScreenColor } from '@/app/editor/color-sampling'

interface ColorPanelProps {
  color: Color
  okhcl?: OkHCLControls | null
  compact?: boolean
  showAlpha?: boolean
  mixed?: boolean
}

type ColorPanelEmit = (event: 'update', color: Color) => void

function createColorPickerPanelContext(props: ColorPanelProps, emit: ColorPanelEmit) {
  const { panels } = useI18n()
  const color = computed(() => props.color)
  const okhcl = computed(() => props.okhcl ?? null)
  const compact = computed(() => props.compact ?? false)
  const showAlpha = computed(() => props.showAlpha ?? true)
  const savedFormat = useLocalStorage('open-pen-color-picker-format', 'rgb')
  const textError = ref(false)
  const sampling = ref(false)
  const samplingError = ref(false)
  let active = true
  onScopeDispose(() => {
    active = false
  })

  async function pickScreenColor() {
    if (sampling.value) return
    samplingError.value = false
    sampling.value = true
    const original = color.value
    try {
      const sample = await sampleScreenColor()
      if (active && color.value === original && sample) colorModel.updateColor(sample)
    } catch {
      if (active) samplingError.value = true
    } finally {
      sampling.value = false
    }
  }
  watch(color, () => {
    textError.value = false
  })
  const colorModel = useColorModel({
    color: () => (showAlpha.value ? color.value : { ...color.value, a: 1 }),
    mixed: () => props.mixed ?? false,
    okhcl: () => okhcl.value?.okhcl,
    format: () => {
      if (compact.value)
        return ['rgb', 'hex', 'css', 'hsl'].includes(savedFormat.value) ? savedFormat.value : 'rgb'
      const format = okhcl.value?.fieldFormat
      return format
    },
    onUpdate: (nextColor) =>
      emit('update', showAlpha.value ? nextColor : { ...nextColor, a: color.value.a }),
    onUpdateOkHCL: (patch) => okhcl.value?.updateOkHCL(patch),
    onFormatChange: (format) => {
      if (compact.value) savedFormat.value = format
      else okhcl.value?.setFieldFormat(format)
    }
  })
  const fieldOptions = computed(() =>
    compact.value
      ? [
          { value: 'rgb', label: showAlpha.value ? 'RGBA' : 'RGB' },
          { value: 'hex', label: 'HEX' },
          { value: 'css', label: 'CSS' },
          { value: 'hsl', label: 'HSL' }
        ]
      : (okhcl.value?.fieldOptions ?? [
          { value: 'rgb', label: panels.value.colorFormatRgb },
          { value: 'hsl', label: panels.value.colorFormatHsl },
          { value: 'hsb', label: panels.value.colorFormatHsb }
        ])
  )
  const isOkHCLFormat = computed(() => colorModel.format.value === 'okhcl' && okhcl.value)
  const css = computed(() =>
    showAlpha.value ? colorToCSSRGBA(color.value) : colorToCSS({ ...color.value, a: 1 })
  )

  function updateColorText(input: string) {
    const value = input.trim()
    const hex = colorModel.format.value === 'hex'
    const parsed = tryParseColor(hex && !value.startsWith('#') ? `#${value}` : value)
    textError.value = !parsed || !Object.values(parsed).every(Number.isFinite)
    if (!parsed || textError.value) return
    colorModel.updateColor(hex || !showAlpha.value ? { ...parsed, a: color.value.a } : parsed)
  }

  function setFieldFormat(value: string) {
    textError.value = false
    colorModel.setFormat(value)
  }

  return {
    panels,
    canSampleScreenColor: canSampleScreenColor(),
    sampling,
    samplingError,
    pickScreenColor,
    color,
    compact,
    showAlpha,
    hex: colorModel.hex,
    css,
    updateColorText,
    textError,
    okhcl,
    rekaColor: colorModel.rekaColor,
    hslColor: colorModel.hsl,
    hsbColor: colorModel.hsb,
    rgbColor: colorModel.rgb,
    sliderPreview: colorModel.sliderPreview,
    sliderGradient: colorModel.sliderGradient,
    okhclSliderPreview: colorModel.okhclSliderPreview,
    okhclSliderGradient: colorModel.okhclSliderGradient,
    fieldOptions,
    fieldFormat: colorModel.format,
    isOkHCLFormat,
    onRekaColorUpdate: colorModel.updateFromReka,
    setFieldFormat,
    updateRGBAHue: colorModel.updateHue,
    updateRGBAAlpha: colorModel.updateAlpha,
    updateRGBChannelValue: colorModel.updateRGBChannel,
    updateHSLChannelValue: colorModel.updateHSLChannel,
    updateHSBChannelValue: colorModel.updateHSBChannel,
    updateOkHCLChannel: colorModel.updateOkHCLChannel
  }
}

export type ColorPickerPanelContext = ShallowUnwrapRef<
  ReturnType<typeof createColorPickerPanelContext>
>

const COLOR_PICKER_PANEL_KEY: InjectionKey<ColorPickerPanelContext> =
  Symbol('ColorPickerPanelContext')

export function provideColorPickerPanel(props: ColorPanelProps, emit: ColorPanelEmit) {
  provide(COLOR_PICKER_PANEL_KEY, proxyRefs(createColorPickerPanelContext(props, emit)))
}

export function useColorPickerPanelContext(): ColorPickerPanelContext {
  const ctx = inject(COLOR_PICKER_PANEL_KEY)
  if (!ctx) throw new Error('Color picker panel controls must be used within ColorPickerPanel')
  return ctx
}
