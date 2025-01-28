<script setup>
import { useGameStore } from '../stores/game';
const gameStore = useGameStore();
</script>

<script></script>
<template>
  <div v-show="false" class="game-controls">
    <button @click="gameStore.handleInteraction('w')">w</button>
    <button @click="gameStore.handleInteraction('s')">s</button>
    <button @click="gameStore.handleInteraction('a')">a</button>
    <button @click="gameStore.handleInteraction('d')">d</button>
  </div>
</template>
