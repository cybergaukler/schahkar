import { defineStore } from 'pinia';
import { config } from '../config';
import { useUserStore } from './user';
import * as gameEngine from '../engines/threeJS/main';

export const useGameStore = defineStore('game', {
  state: () => ({
    id: null,
    keyboardControls: false,
    module: null,
    turn: {
      current: 1,
      color: 'white',
    },
    board: {
      initial: {
        cursor: {
          placement: null,
          interactionType: null,
        },
        setup: {},
      },
      shape: [],
      placement: {},
      camera: {
        isAnimating: false,
      },
      cursor: {
        placement: null,
        interactionType: null,
      },
      mouse: {
        hover: {
          hoverStart: new Date(),
          x: null,
          y: null,
        },
      },
    },
    characterSelection: {
      white: [],
      black: [],
    },
    movementOptions: {},
  }),
  getters: {
    getMovementOptions: (state) => (placement) => (state.movementOptions[placement] ? Object.values(state.movementOptions[placement]) : []),
  },
  actions: {
    /** select a module to play
     * @param {string} id - The id of the module to select
     * @returns {Promise<void>}
     */
    async selectModule(id) {
      const userStore = useUserStore();
      let response;
      try {
        response = await fetch(`${config.API_HOST}/module/v1/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userStore.id,
            'x-user-key': userStore.key,
          },
        });
        const module = await response.json();
        if (!module) throw new Error('getting module failed');
        userStore.currentSelection.module.id = module.id;
        this.module = { name: module.name, id: module.id };

        // unless the user already has a specific encounter stored, choose the first encounter in the module to create the board
        const encounter = module.encounters[0];

        // start a game based on the encounter
        response = await fetch(`${config.API_HOST}/game/v1`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userStore.id,
            'x-user-key': userStore.key,
          },
          body: JSON.stringify({ module: { id: module.id }, encounter: { name: encounter.name } }),
        });
        const game = await response.json();
        if (!game) throw new Error('getting game failed');
        this.id = game.id;

        // the shape defines what tiles are available on the board from the white players perspective
        this.board.shape = encounter.board.shape;
        this.board.initial.setup = encounter.board.setup;

        // the cursor is set to the starting position (usually that of the white players shah)
        this.board.initial.cursor.placement = Object.entries(encounter.board.setup).find((entry) => entry[1].cursor)?.[0];
        this.board.cursor.placement = this.board.initial.cursor.placement;

        // use the game engine to create the module
        await gameEngine.createEncounter(Object.assign({}, encounter, { board: this.board }));
        this.board.placement = this.board.initial.setup;
        this.movementOptions = game.movementOptions;
        // get the characters for the module
        for (const color of ['white', 'black']) {
          const ownership = color === 'white' ? 'H1' : 'C1';
          for (const value of Object.values(this.board.initial.setup).filter((setup) => setup.owner === ownership)) {
            console.log('initial character', value.character);
            this.characterSelection[color].push(
              Object.assign(
                value.character,
                {
                  image: `https://shahkar.fra1.digitaloceanspaces.com/settings/${module.setting.name.toLowerCase()}/characters/${color}/${value.character.role}.webp`,
                  name: color === 'white' ? value.character.name : '--',
                  selectedManeuver: 'regular',
                  isHovered: false,
                  isSelected: false,
                },
                game.characters.find((character) => character.id === value.character.id)
              )
            );
          }
        }
        // move the cursor to its initial position and select the character
        await gameEngine.moveCursor('to', this.board.initial.cursor.placement);
        await this.selectCharacter(
          this.characterSelection.white.find((character) => character.id === this.board.initial.setup[this.board.initial.cursor.placement].character.id),
          'exploration'
        );
        this.keyboardControls = true;
      } catch (error) {
        console.error('getting module failed:', error);
      }
    },
    /** unselect all characters
     * @returns {Promise<void>}
     */
    async unSelectCharacters() {
      for (const color of ['white', 'black']) this.characterSelection[color].forEach((character) => Object.assign(character, { isHovered: false, isSelected: false }));
      console.log('unselecting all characters');
    },
    /** selects a character (piece on the board)
     * @param {Object} character - The character to select
     * @param {number} character.id - The id of the character to select
     * @param {string} mode - The type of interaction ('selection'|'exploration')
     * @returns {Promise<void>}
     */
    async selectCharacter(character, selectionType) {
      console.log('selectCharacter', character, selectionType);
      for (const color of ['white', 'black']) this.characterSelection[color].forEach((character) => Object.assign(character, { isHovered: false }));
      character.isHovered = true;
      for (const color of ['white', 'black']) this.characterSelection[color].forEach((character) => Object.assign(character, { isSelected: false }));
      character.isSelected = true;
      const [placement] = Object.entries(this.board.placement).find(([, value]) => value.character.id === character.id);

      if (!placement) return;
      const maneuvers = this.getMovementOptions(placement);
      console.log('maneuvers', maneuvers, character.selectedManeuver);
      const maneuver = maneuvers.find((maneuver) => maneuver.name === character.selectedManeuver);
      console.log('maneuver', maneuver);
      if (!maneuver || !maneuver.options.length > 0) return;
      await gameEngine.clearMovementOptions();
      await gameEngine.showMovementOptions({
        name: maneuver.name,
        description: maneuver.description,
        options: maneuver.options.map((option) => ({ placement: option.placement, type: option.type })),
      });
    },
    /** handles the interaction with the board
     * @param {Object} event - The event to handle
     * @param {string} type - The type of interaction ('mousemove'|'mouseclick'|'keyboard')
     * @returns {Promise<void>}
     */
    async handleInteraction(event, type) {
      if (!this.keyboardControls) return false;
      event.preventDefault();

      if (type === 'mousemove') {
        // the hover event should only be checked every 500ms
        const hoverTime = Date.now() - this.board.mouse.hover.hoverStart;
        if (hoverTime > 500) {
          // hovering will not select a character or move the cursor, it just highlights the tile and the character sheet if hovering over a character
          const interactionTarget = await gameEngine.getInteractionTarget(event);
          if (interactionTarget) {
            switch (interactionTarget.type) {
              case 'tile':
                if (this.board.placement[interactionTarget.name.split(':')[1]] && this.board.placement[interactionTarget.name.split(':')[1]].character) await this.selectCharacter(this.board.placement[interactionTarget.name.split(':')[1]].character, 'exploration');
                break;
              case 'moveTo':
                // console.log('moveTo', interactionTarget);
                break;
            }
          }
        }
      }

      if (type === 'mouseclick') {
        // the click event directly triggers the interaction
        const interactionTarget = await gameEngine.getInteractionTarget(event);
        if (interactionTarget) {
          const target = interactionTarget.name.split(':')[1];
          switch (interactionTarget.type) {
            case 'tile':
              // always move the cursor to the tile that the click was on
              await gameEngine.clearMovementOptions();
              await gameEngine.moveCursor('to', target);
              Object.assign(this.board.cursor, { placement: target, interactionType: 'selection' });
              // if there is a character on the tile, select it if not unselect all characters
              if (this.board.placement[target] && this.board.placement[target].character) {
                await this.selectCharacter(this.board.placement[target].character, 'selection');
              } else {
                await this.unSelectCharacters();
              }
              break;
            case 'moveTo':
              console.log('moveTo', interactionTarget);
              await this.moveCharacter(interactionTarget.name.split(':')[1]);
              break;
          }
        }
        console.log('interactionTarget from clicking', interactionTarget);
      }

      if (type === 'keyboard') {
        console.log('keyboard event', event);
        // Game Cursor movement, the keypress is adjusted by the camera perspective but the position on the board is not
        if (['a', 'd', 's', 'w'].includes(event.key)) {
          let direction = '';
          switch (event.key) {
            case 'a':
              direction = 'left';
              break;
            case 'd':
              direction = 'right';
              break;
            case 's':
              direction = 'down';
              break;
            case 'w':
              direction = 'up';
              break;
          }
          const newCursorPlacement = await gameEngine.moveCursor(direction);
          Object.assign(this.board.cursor, { placement: newCursorPlacement, interactionType: 'selection' });
          const placementAtCursorPosition = this.board.placement[newCursorPlacement];
          console.log('newCursorPosition', newCursorPlacement, 'placementAtCursorPosition', placementAtCursorPosition);
          if (!placementAtCursorPosition) {
            await this.unSelectCharacters();
          } else {
            const character = this.characterSelection[placementAtCursorPosition.character.color].find((character) => character.id === placementAtCursorPosition.character.id);
            await this.selectCharacter(character, 'exploration');
          }
          return true;
        } else if (['Home', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'PageUp', 'PageDown'].includes(event.key)) {
          if (this.board.camera.isAnimating) return false;
          this.board.camera.isAnimating = true;
          switch (event.key) {
            case 'Home':
              await gameEngine.changePerspective('home');
              await gameEngine.moveCursor('to', this.board.initial.cursor.placement);
              break;
            case 'ArrowUp':
              await gameEngine.changePerspective('up');
              break;
            case 'ArrowDown':
              await gameEngine.changePerspective('down');
              break;
            case 'ArrowRight':
              await gameEngine.changePerspective('right');
              break;
            case 'ArrowLeft':
              await gameEngine.changePerspective('left');
              break;
            case 'PageUp':
              // TODO: zoom behind currently selected piece
              break;
            case 'PageDown':
              // TODO: zoom out to last view
              break;
          }
          this.board.camera.isAnimating = false;
          return true;
        } else if (event.key === 'Enter') {
          const placementAtCursorPosition = this.board.placement[this.board.cursor.placement];
          if (!placementAtCursorPosition) return false;
          const character = this.characterSelection[placementAtCursorPosition.character.color].find((character) => character.id === placementAtCursorPosition.character.id);
          if (!character) {
            await this.unselectCharacters();
            console.log('selecting empty tile', this.board.cursor.placement);
          } else {
            await this.selectCharacter(character, 'selection');
            console.log('selecting piece', this.board.cursor.placement);
          }
        } else if (event.key === 'Esc') {
          await this.unSelectCharacters();
        }
      }
    },
    /** moves a character (piece on the board)
     * @param {Object} piece - The piece to move
     * @param {number} piece.id - The id of the piece to move
     * @param {string} placement - The placement to move to
     * @returns {Promise<void>}
     */
    async moveCharacter(piece, placement) {
      // no need to get movement options if the piece doesnt belong to the human player
      if (!piece.owner.startsWith('H')) return;
      const userStore = useUserStore();
      const response = await fetch(`${config.API_HOST}/game/v1/${this.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userStore.id,
          'x-user-key': userStore.key,
        },
        body: JSON.stringify({ piece, placement }),
      });
      const movementOptions = await response.json();
      console.log('movementOptions', movementOptions);
      // get the movement options for the piece
      console.log('cursor at placement', placement);
    },
  },
});
