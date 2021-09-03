import { Middleware } from "koa"
import axios, { Method } from "axios"
import decompress from "inflation";
import raw from "raw-body";
import debug from "debug";

const log = debug("forwardproxy")

const cfHeaders = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-forwarded-for",
    "cf-ray",
    "cf-ipcountry",
    "cf-visitor",
    "cdn-loop",
    "cf-worker"
]

function proxy(options: ProxyOptions): Middleware {
    return async function (ctx) {
        let body = await raw(decompress(ctx.req));
        let headers = { ...ctx.headers };

        if (options.withoutCloudflareHeaders) {
            for (const h of cfHeaders) {
                delete headers[h];
            }
        }
        delete headers["host"]

        let originalUrl = new URL(`${ctx.protocol}://${ctx.host}${ctx.url}`)
        log("url-before", originalUrl);
        if ("host" in options) {
            let u = new URL(originalUrl.toString());
            u.host = options.host;
            var patchedUrl = u;
        } else {
            var patchedUrl = new URL(options.remap(originalUrl.toString()));
        }
        log("url-after", patchedUrl);


        let response = await axios({
            method: ctx.method as Method,
            url: patchedUrl.toString(),
            data: body,
            headers: headers,
            validateStatus: () => true,
            maxRedirects: 0
        });

        if (options.patchRedirects ?? true) {
            if (response.headers.location == originalUrl.host) {
                response.headers.location = patchedUrl.host
            }
        }

        ctx.body = response.data;
        ctx.set(response.headers);
        ctx.status = response.status;
    }
}

type ProxyOptions = ({
    host: string
} | {
    remap: (url: string) => string
}) & {
    withoutCloudflareHeaders?: boolean
    patchRedirects?: boolean
}

export default proxy;
module.exports = proxy;