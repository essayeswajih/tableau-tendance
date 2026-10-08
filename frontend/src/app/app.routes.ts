import { Routes } from '@angular/router';
import { BoutiquePage } from './pages/boutique.page';
import { ContactPage } from './pages/contact.page';
import { GaleriePage } from './pages/galerie.page';
import { HomePage } from './pages/home.page';
import { DashboardPage } from './pages/dashboard.page';
import { LoginPage } from './pages/login.page';
import { PanierPage } from './pages/panier.page';
import { CommandePage } from './pages/commande.page';
import { CollectionsPage } from './pages/collections.page';
import { ArticlePage } from './pages/article.page';
import { AProposPage } from './pages/a-propos.page';
import { authGuard } from './shared/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    title: 'Tableau Tendance | Tableaux decoratifs modernes en Tunisie',
  },
  {
    path: 'boutique',
    component: BoutiquePage,
    title: 'Boutique Tableau Tendance | Vente de tableaux en Tunisie',
  },
  {
    path: 'article/:slug',
    component: ArticlePage,
    title: 'Article Tableau Tendance | Detail tableau decoratif',
  },
  {
    path: 'collections',
    component: CollectionsPage,
    title: 'Collections Tableau Tendance | Inspiration decoration murale',
  },
  {
    path: 'a-propos',
    component: AProposPage,
    title: 'A propos Tableau Tendance | Tableaux decoratifs en Tunisie',
  },
  {
    path: 'galerie',
    component: GaleriePage,
    title: 'Galerie Tableau Tendance | Tableaux decoratifs',
  },
  {
    path: 'contact',
    component: ContactPage,
    title: 'Contact Tableau Tendance | Livraison partout en Tunisie',
  },
  {
    path: 'panier',
    component: PanierPage,
    title: 'Panier Tableau Tendance | Votre commande',
  },
  {
    path: 'commande',
    component: CommandePage,
    title: 'Commande Tableau Tendance | Paiement a la livraison',
  },
  {
    path: 'login',
    component: LoginPage,
    title: 'Admin Tableau Tendance | Connexion',
  },
  {
    path: 'dashboard',
    component: DashboardPage,
    canActivate: [authGuard],
    title: 'Dashboard Tableau Tendance | Administration',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
