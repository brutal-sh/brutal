import { createRouter, createWebHistory } from 'vue-router'

import { homeLocation } from '@/app/home/location'
import { ROOM_HOME_PATH } from '@/app/tabs/address'

import WorkspaceView from './views/WorkspaceView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: ROOM_HOME_PATH, component: WorkspaceView },
    {
      // Links to the storage workspace open Home on it.
      path: '/storage',
      redirect: (to) => {
        homeLocation.value = { kind: 'storage' }
        return { path: '/', query: to.query }
      }
    },
    { path: '/demo', component: WorkspaceView, meta: { demo: true } },
    // A peer-to-peer room, joined by its ID.
    { path: '/rooms/:roomId', component: WorkspaceView },
    // Cloud invitations and links; the app takes their secret out of the address on start.
    { path: '/invitations/:invitationId', component: WorkspaceView },
    { path: '/share/:shareId', component: WorkspaceView },
    // A Cloud document, or one of its versions, for whoever signs in with access to it.
    { path: '/documents/:documentId', component: WorkspaceView }
  ]
})

export default router
