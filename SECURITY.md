# Sécurité NOVAÉ

## Secrets
Les secrets suivants doivent rester uniquement dans Cloudflare :
- `CJ_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Ne jamais les placer dans GitHub, le JavaScript public, une capture d'écran ou un message.

## Paiements
- Les prix sont définis côté serveur.
- Le navigateur ne décide jamais du montant Stripe.
- Les sessions Stripe utilisent une clé d'idempotence.
- Les webhooks doivent avoir une signature Stripe valide.
- Le montant reçu doit correspondre au panier attendu côté serveur.

## Fulfillment
Le fulfillment CJ est volontairement désactivé. Le mode actuel est `dry-run`.

Avant d'activer des commandes réelles, utiliser un stockage persistant pour empêcher qu'un même événement Stripe déclenche plusieurs commandes fournisseur, même après redémarrage ou changement d'instance du Worker.
