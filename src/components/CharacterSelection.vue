<script setup>
import { computed } from 'vue';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import '@flaticon/flaticon-uicons/css/all/all.css';

const userStore = useUserStore();
const gameStore = useGameStore();

// an array of all roles that are playable for a given color
const playableRoles = computed(() => (color) => ['shah', 'vizier', 'asb', 'rukh', 'piyadeh'].filter((role) => (gameStore.characterSelection[color] || []).filter((character) => character.role === role).length > 0));

// from the character id, get the maneuvers
const maneuvers = computed(() => (id) => {
  const [placement] = Object.entries(gameStore.board.placement).find(([, value]) => value.character.id === id);
  if (!placement) return [];
  const maneuvers = gameStore.getMovementOptions(placement);
  maneuvers.forEach((maneuver) => {
    maneuver.isDisabled = maneuver.options.length === 0;
  });
  return maneuvers;
});

const handleHover = (character, event) => {
  character.isHovered = event === 'enter';
  console.log('hover', character.role, character.isHovered);
};

const handleClick = (character) => {
  gameStore.selectCharacter(character, 'selection');
};

const handleSelectManeuver = (character, maneuver) => {
  console.log('maneuver change', maneuver);
  character.selectedManeuver = maneuver.name;
};
</script>

<template>
  <div class="characterSelection-container" :show="userStore.currentSelection.module.id !== null">
    <template v-for="color in ['white', 'black']" :key="color">
      <div class="character-color-container">
        <template v-for="role in playableRoles(color)" :key="role">
          <template v-for="character in gameStore.characterSelection[color].filter((character) => character.role === role)" :key="character.id">
            <div :class="['character-container', color, character.isSelected ? 'selected' : '', character.isHovered ? 'hoveredd' : '']" @mouseenter="handleHover(character, 'enter')" @mouseleave="handleHover(character, 'leave')" @click="handleClick(character)">
              <div :class="['character-stats-container', color, character.isHovered ? 'hovered' : '']">
                <div class="character-stat">
                  <i class="fi fi-sr-heart">
                    <span class="stat-value">{{ character.attributes.health }}</span>
                  </i>
                </div>
                <div class="character-stat">
                  <i class="fi fi-sr-hand-back-fist">
                    <span class="stat-value">{{ character.attributes.attack }}</span>
                  </i>
                </div>
                <div class="character-stat">
                  <i class="fi fi-sr-shield">
                    <span class="stat-value">{{ character.attributes.defense }}</span>
                  </i>
                </div>
              </div>
              <div :class="['character-portrait', color]">
                <img class="character-image" :src="character.image" :alt="character.role" />
              </div>
              <div :class="['character-maneuver-container', color]">
                <div class="character-maneuver">
                  <i class="character-maneuver-icon fi fi-sr-boot" />
                  <div class="character-maneuver-selection-container">
                    <select class="character-maneuver-name">
                      <option @click.prevent="handleSelectManeuver(character, maneuver)" v-for="maneuver in maneuvers(character.id)" :disabled="maneuver.isDisabled" :key="maneuver.name">{{ maneuver.name }}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="character-name">
                <div class="character-name-text">{{ character.name }}</div>
                <div class="character-name-role">{{ color }} {{ character.role }}</div>
              </div>
              <div :class="['character-attributes-container', color]" v-if="color === 'white'">
                <div class="character-attribute" v-for="attribute in ['str', 'dex', 'con', 'int', 'wis']" :key="attribute">
                  <span class="stat-value">{{ attribute }}:{{ character.attributes[attribute] }}</span>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<style>
@import './CharacterSelection.css';
/* @import '@/assets/icons/fi.css'; */
</style>
