# NOVAÉ — statut pré-lancement

## Validé en environnement de test
- Boutique GitHub Pages en ligne.
- Catalogue de 16 produits.
- Prix synchronisés entre le site et le backend Stripe.
- Disponibilité CJ vérifiée côté serveur.
- Estimation de livraison Canada via CJ.
- Stripe Checkout en mode test.
- Vérification serveur des sessions Stripe.
- Webhook Stripe signé.
- Dry-run CJ après paiement test.
- Référence de commande test NOVAÉ.
- Idempotence Stripe pour limiter les doubles sessions.
- Vérification d'intégrité du montant.
- Blocage des origines navigateur non autorisées.
- Panier vidé uniquement après paiement Stripe confirmé.

## Verrous de sécurité actuels
- `fulfillmentMode = dry-run`.
- Aucune création de commande CJ réelle.
- Aucune clé API exposée dans le dépôt.
- Aucun paiement réel activé.
- Les pages checkout/compte restent en noindex.

## Avant une ouverture réelle
- Activer et vérifier le compte Stripe de production selon les exigences Stripe.
- Créer des clés Stripe live et un webhook live séparé.
- Mettre en place un stockage persistant pour les commandes et l'idempotence de fulfillment (KV/D1 ou autre stockage adapté).
- Ajouter un système d'e-mails transactionnels.
- Finaliser taxes, coordonnées légales, politiques et support.
- Tester les 16 produits avec coût de livraison réel et disponibilité.
- N'activer la création de commande CJ qu'après validation de tous les contrôles ci-dessus.

## Important
Le code actuel est volontairement conçu pour tester le parcours complet sans déclencher de vraie commande fournisseur.
