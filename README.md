```
npm install
```

```
npx wrangler vectorize create wcasia-rag-sessions --dimensions=1024 --metric=cosine
npx wrangler vectorize create wcasia-rag-general --dimensions=1024 --metric=cosine
```



```bash
% npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
% npx wrangler secret put CLOUDFLARE_API_TOKEN
```


## Deployment

```
npm run dev
```

```
npm run deploy
```

npx wrangler vectorize create wck-2024 --dimensions=1024 --metric=cosine