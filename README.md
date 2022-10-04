# koa forwardproxy
With this koa middleware, you can forward requests to a different server and return the response to the user, effectively making your webserver into a webproxy.
The package currently only exports CommonJS, but it can also just be imported into ESM.
It is written in typescript and fully typed. Typedef (.d.ts) files are included in npm releases.
## Installation
`npm i koa-forwardproxy`
## Usage
```ts
import proxy from "koa-forwardproxy";
import Koa from "koa";
const app = new Koa();

app.use(proxy({
    host: "example.com", // The host of every incoming request will be replaced with this host to send the proxied request.
    usesCloudflare: true, // If incoming requests are routed through cloudflare, you may need to enable this to clean up extra headers from cloudflare and fix HTTPS upgrading
    patchRedirects: true, // Enable to modify the URL of the `location` header on responses, which might otherwise redirect your visitor to the real, non-proxied site.  
}))
// Alternatively to using the `host` option:
app.use(proxy({
    remapUrl: (url: string)=>{
        // This gets called on each incoming request. The return value will be used as the url that the server sends.
        // This code just changes the TLD and Protocol but you can also modify the URL path etc
        let u = new URL(url);
        u.protocol = "https:";
        u.host = u.host.replace(/\.com$/, ".de")
        return u.toString();
    }
}))
```