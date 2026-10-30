<script setup lang="ts">
import { tv } from 'tailwind-variants'

import workspaceTheme from '@/theme/home/workspace'
const styles = tv(workspaceTheme)()
</script>
<template>
  <main :class="styles.root()">
    <div :class="styles.content()"><slot /></div>
  </main>
</template>
