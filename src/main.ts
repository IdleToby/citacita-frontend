import './assets/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import i18n from './i18n.js'
import 'highlight.js/styles/github-dark.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
