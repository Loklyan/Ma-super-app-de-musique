import { readable } from 'svelte/store';

// Routage par « hash » : évite les 404 de GitHub Pages au rechargement.
export type Route = 'accueil' | 'bibliotheque' | 'file' | 'reglages' | 'lecteur';
const ROUTES: Route[] = ['accueil', 'bibliotheque', 'file', 'reglages', 'lecteur'];

function parse(): Route {
  const r = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'accueil';
}

export const route = readable<Route>(parse(), set => {
  const on = () => set(parse());
  window.addEventListener('hashchange', on);
  return () => window.removeEventListener('hashchange', on);
});

export function go(r: Route): void {
  location.hash = '#/' + r;
}

/** Ferme le lecteur plein écran en revenant en arrière (comme le bouton Retour d'Android). */
export function closePlayer(): void {
  if (history.length > 1) history.back();
  else go('accueil');
}
