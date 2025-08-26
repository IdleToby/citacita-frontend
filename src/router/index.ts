import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import JobsView from '@/views/JobsView.vue'
import GrantsView from '@/views/GrantsView.vue'
import AIView from '@/views/AIView.vue'
import MapView from '@/views/MapView.vue'
import FAQView from '@/views/FAQView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: JobsView,
    },
    {
      path: '/grants',
      name: 'grants',
      component: GrantsView,
    },
    {
      path: '/ai',
      name: 'ai',
      component: AIView,
    },
    {
      path: '/map',
      name: 'map',
      component: MapView,
    },
    {
      path: '/faq',
      name: 'faq',
      component: FAQView,
    }
  ],
})

export default router
