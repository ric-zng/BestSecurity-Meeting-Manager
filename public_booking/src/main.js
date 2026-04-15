import { createApp } from "vue";
import { createPinia } from "pinia";
import { frappeRequest, setConfig, FrappeUI } from "frappe-ui";
import App from "./App.vue";
import { router } from "./router.js";
import "./index.css";

setConfig("resourceFetcher", frappeRequest);

const pinia = createPinia();
const app = createApp(App);

app.use(FrappeUI);
app.use(pinia);
app.use(router);

app.mount("#app");
