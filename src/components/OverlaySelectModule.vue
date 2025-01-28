<script setup>
import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';

const userStore = useUserStore();
const gameStore = useGameStore();

const selection = ref(null);
const handleSelectModule = async () => {
  console.log(selection.value);
  await gameStore.selectModule(selection.value);
};
</script>

<template>
  <div v-if="userStore.isLoggedIn && userStore.modules.length > 0 && userStore.currentSelection.module.id === null" class="moduleSelection-overlay">
    <div class="moduleSelection-container">
      <h2>Select a module</h2>
      <div class="form-group" v-if="userStore.modules.length > 0">
        <select placeholder="Select Module" v-model="selection" @change="handleSelectModule()">
          <option v-for="module in userStore.modules" :key="module.id" :value="module.id">{{ module.name }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.moduleSelection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.moduleSelection-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 300px;
}

.form-group {
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 0.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #45a049;
}
</style>
