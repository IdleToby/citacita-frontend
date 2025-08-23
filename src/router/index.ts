import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ProductsView from '@/views/ProductsView.vue'
import IngredientsView from '@/views/IngredientsView.vue' //使用正确的文件名（复数形式ingredients）
import ProductDetailView from '@/views/ProductDetailView.vue'
import IngredientsDetailView from '@/views/IngredientsDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/products',
      name: 'products',
      component: ProductsView,
    },
      {
      path: '/productDetail/:notifNo',
      name: 'productDetail',
      component: ProductDetailView,
    },
    {
      path: '/ingredients',
      name: 'ingredients',
      component: IngredientsView, //使用正确的组件名
    },
    {
      path: '/IngredientsDetailView/:ingredientName',
      name: 'IngredientsDetailView',
      component: IngredientsDetailView, //成分详情页面
    }
  ],
})

export default router
