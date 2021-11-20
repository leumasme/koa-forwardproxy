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

type ProxyOptions = ({
    host: string
} | {
    remap: (url: string) => string
}) & {
    usesCloudflare?: boolean
    patchRedirects?: boolean
}

function proxy(options: ProxyOptions): Middleware {
    return async function (ctx) {
        let body = await raw(decompress(ctx.req));
        let headers = { ...ctx.headers };

        let originalUrl = new URL(`${ctx.protocol}://${ctx.host}${ctx.url}`)
        log("url-before", originalUrl.toString());
        if ("host" in options) {
            let u = new URL(originalUrl.toString());
            u.host = options.host;
            var patchedUrl = u;
        } else {
            var patchedUrl = new URL(options.remap(originalUrl.toString()));
        }
        log("url-after", patchedUrl.toString());

        if (options.usesCloudflare) {
            for (const h of cfHeaders) {
                delete headers[h];
            }
            try {
                let cfvisotor = JSON.parse(ctx.request.headers["cf-visitor"] as string);
                patchedUrl.protocol = cfvisotor.scheme + ":"
            } catch (e) {
                log("cf-visitor", ctx.request.headers["cf-visitor"], e)
            }
        }
        delete headers["host"]

        let response = await axios({
            method: ctx.method as Method,
            url: patchedUrl.toString(),
            data: body,
            headers: headers,
            validateStatus: () => true,
            maxRedirects: 0
        });
        log("response", response.status, response.headers["content-length"], response.data.length)
        log("data(hex)", response.data.toString("hex").substr(0, 100))
        delete response.headers["content-length"]

        if ((options.patchRedirects ?? true) && response.headers.location) {
            let locUrl = new URL(response.headers.location)
            if (locUrl.host == patchedUrl.host) {
                locUrl.host = originalUrl.host
                response.headers.location = locUrl.toString()
                log("Patched location", response.headers.location)
            } else log("Not patching location: Redirecting somewhere else!",
                locUrl.host, patchedUrl.host)
        }

        ctx.body = response.data;
        ctx.set(response.headers);
        ctx.status = response.status;
    }
}

export default proxy;
module.exports = proxy;