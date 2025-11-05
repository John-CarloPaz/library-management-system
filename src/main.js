import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faBook, faCashRegister, faChevronLeft, faCircleUser, faHouse, faIdCard, faUserGraduate, faBookOpen, faHandshakeSimple, faClipboard, faUserTie, faUsers, faPencil, faEye, faBoxArchive, faPlus, faReceipt, faChevronRight, faQrcode, faSignOutAlt, faCogs, faUser, faMessage, faBell, faEarthAsia } from '@fortawesome/free-solid-svg-icons';
import { faAddressCard } from '@fortawesome/free-regular-svg-icons';
library.add(
    faHouse,
    faQrcode,
    faMessage,
    faBell,
    faEarthAsia,
    faUser,
    faClipboard,
    faSignOutAlt,
    faCogs,
    faPlus,   
    faEye,      
    faReceipt,
    faAddressCard,
    faUserTie,
    faBoxArchive,
    faPencil,
    faUsers,
    faIdCard,
    faHandshakeSimple,
    faBookOpen,
    faBook,
    faChevronLeft,
    faChevronRight,
    faCircleUser,
    faUserGraduate,
    faCashRegister
)

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'fa',
        sets: {
            fa: {
                component: FontAwesomeIcon,
            },
        },
    }
  })
const app = createApp(App);

app.use(router);
app.use(vuetify); 
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');