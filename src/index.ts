import { Middleware } from "koa"
import axios, { Method } from "axios"
import decompress from "inflation";
import raw from "raw-body";

function proxy(options: ProxyOptions): Middleware {
    return async function (ctx) {
        let body = await raw(decompress(ctx.req));

        let url = `${ctx.protocol}://${ctx.host}${ctx.url}`;
        if (options) {
            if ("host" in options) {
                let u = new URL(url);
                u.host = options.host;
                url = u.toString();
            } else {
                url = options.remap(url)
            }
        }

        let response = await axios({
            method: ctx.method as Method,
            url: url,
            data: body,
            headers: ctx.request.headers
        });

        ctx.response.body = response.data;
        ctx.response.headers = response.headers;
        ctx.response.status = response.status;
    }
}

type ProxyOptions = {
    host: string
} | {
    remap: (url: string) => string
}

export default proxy
module.exports = proxy