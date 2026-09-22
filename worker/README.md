# NOVAÉ CJ API bridge

This Cloudflare Worker keeps the CJdropshipping API key on the server side.

## Required secret

Create a Worker secret named:

CJ_API_KEY

Never put the API key in GitHub, app.js, products.js, HTML, or any client-side file.

## Public read-only routes

- /health
- /product?sku=CJ...
- /variants?sku=CJ...
- /stock?sku=CJ...

Only the 16 NOVAÉ CJ SKUs are accepted.

The allowed production browser origin is:
https://midnightmidnightfil-tech.github.io
