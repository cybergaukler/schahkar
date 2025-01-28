import { createRouter, createWebHistory } from 'vue-router';
import Credits from '../views/Credits.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/join',
    name: 'SignUp',
    component: () => import('../views/Join.vue'),
  },
  {
    path: '/credits',
    name: 'Credits',
    component: Credits,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
