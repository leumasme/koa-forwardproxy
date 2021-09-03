import { Middleware } from "koa"
import axios, { Method } from "axios"
import decompress from "inflation";
import raw from "raw-body";

function proxy(options: ProxyOptions): Middleware {
    return async function (ctx, next) {
        let body = await raw(decompress(ctx.req));

        let response = await axios({
            method: ctx.method as Method,
            url: ctx.url,
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