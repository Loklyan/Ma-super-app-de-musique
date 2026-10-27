import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import './app.css';
import { player } from './queue/controller';
import { refreshLibrary } from './ui/stores';

registerSW({ immediate: true });

// Demande que le stockage (bibliothèque locale) ne soit pas purgé automatiquement.
void navigator.storage?.persist?.().catch(() => {});

void refreshLibrary();
void player.restore();

export default mount(App, { target: document.getElementById('app')! });
