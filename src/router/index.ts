// 路由（无登录模式，直接进入首页）
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue')
      },
      {
        path: 'timeline',
        name: 'timeline',
        component: () => import('@/views/TimelineView.vue')
      }
    ]
  },
  // 独立页面（无底部导航）
  {
    path: '/record/feeding',
    name: 'record-feeding',
    component: () => import('@/views/RecordFeedingView.vue')
  },
  {
    path: '/record/sleep',
    name: 'record-sleep',
    component: () => import('@/views/RecordSleepView.vue')
  },
  {
    path: '/record/diaper',
    name: 'record-diaper',
    component: () => import('@/views/RecordDiaperView.vue')
  },
  {
    path: '/record/milestone',
    name: 'record-milestone',
    component: () => import('@/views/RecordMilestoneView.vue')
  },
  {
    path: '/baby/new',
    name: 'baby-new',
    component: () => import('@/views/BabyEditView.vue')
  },
  {
    path: '/baby/:id/edit',
    name: 'baby-edit',
    component: () => import('@/views/BabyEditView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
// 不再有 auth guard — 所有路径都直接可达
