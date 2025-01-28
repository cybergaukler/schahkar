import { defineStore } from 'pinia';
import { config } from '../config';

let response = null;
let data = null;

export const useUserStore = defineStore('user', {
  state: () => ({
    name: null,
    id: null,
    key: null,
    isLoggedIn: false,
    modules: [],
    currentSelection: {
      module: { id: null },
    },
  }),
  actions: {
    async login(username, password) {
      try {
        response = await fetch(`${config.API_HOST}/user/v1/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: username, password: password }),
        });
        data = await response.json();
        if (!data) throw new Error('Login failed');

        // login successful
        this.isLoggedIn = true;
        this.username = username;
        this.id = data.id;
        this.key = data.key;

        // after a successful login, we need to get the modules that are available to the user
        response = await fetch(`${config.API_HOST}/settings/v1`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': this.id,
            'x-user-key': this.key,
          },
          body: JSON.stringify({ filter: [] }),
        });
        data = await response.json();
        if (!data) throw new Error('no modules found');
        this.modules = [];
        for (const setting of data) {
          for (const module of setting.modules) {
            this.modules.push(Object.assign({}, module, { setting: { id: setting.id, name: setting.name } }));
          }
        }
      } catch (error) {
        console.error('Login failed:', error);
        this.isLoggedIn = false;
        this.username = null;
        throw error;
      }
    },

    logout() {
      this.isLoggedIn = false;
      this.username = null;
    },
  },
  getters: {
    // your getters here
  },
});
