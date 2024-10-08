/*
    WebGL built-in objects extension
    Only deals with WebGL2RenderingContext for now.

    Add context creation, helpers for errors, and WebGL shortcut export.
*/
import { extdProto, extd } from "./common-extension.mjs"
import { isStr, is } from "./util.mjs"

// Export a shortcut name for this bad-boy
const WebGL2 = WebGL2RenderingContext;
export default WebGL2;

// error array populated with most recent call to getErrors
extdProto(WebGL2, "errors", []);
// will indicate if error array is populated
extd(WebGL2.prototype, "hasErrors", { get(){ return this.errors.length > 0; }});

// creates WebGL2RenderingContext instance
extd(WebGL2, "create", {value:function(canvasElOrQuery) {
    // find canvas
    const canvas = (c => {
        // if falsy find first canvas in document
        if (!c) {
            c = document.getElementsByTagName("canvas")[0];
        }
        // query document if string
        if (isStr(c)) {
            c = document.querySelector(c);
        }
        // we have a canvas
        if (is(c, HTMLCanvasElement)) {
            return c;
        }
        throw new Error(
            `Error creating WebGL2RenderingContext context. Could not find canvas.`+
            `canvasElOrQuery: ${c}\n`
        );
    })(canvasElOrQuery);

    // setup context
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext("webgl2");

    // getContext successful?
    if (!gl) {
        throw new Error(
            `Error creating WebGL2RenderingContext context.\n`+
            `canvasElOrQuery: ${canvasElOrQuery}\n`+
            `canvas: ${canvas}\n`
        );
    }

    // check errors just to make sure
    gl.logErrors();
    return gl;
}});

extdProto(WebGL2, "throwErrors", function() {
    const errs = this.getErrors();
    errs.forEach(err => { throw new Error(err); });
});

extdProto(WebGL2, "logErrors", function(msg) {
    const errs = this.getErrors();
    if (errs.length) {
        console.log(`%c`+
            `${msg} errors found in ${this}:\n`+
            `\t${Error().stack.replaceAll("\n", "\n\t")}\n\n`+
            `\t${errs.join("\n\t")}`,
            "color:red;"
        );
    }
    return errs;
});

// run getError until exhausted and populate errors array
extdProto(WebGL2, "getErrors", function() {
    this.errors.length = 0;
    let err;
    while ((err = this.getError())) {
        switch(err) {
        case this.INVALID_ENUM:                   this.errors.push("INVALID_ENUM");
        case this.INVALID_VALUE:                  this.errors.push("INVALID_VALUE");
        case this.INVALID_OPERATION:              this.errors.push("INVALID_OPERATION");
        case this.INVALID_FRAMEBUFFER_OPERATION:  this.errors.push("INVALID_FRAMEBUFFER_OPERATION");
        case this.OUT_OF_MEMORY:                  this.errors.push("OUT_OF_MEMORY");
        case this.CONTEXT_LOST_WEBGL:             this.errors.push("CONTEXT_LOST_WEBGL");
        default: {};
        }
    }
    return this.errors;
});

extdProto(WebGL2, "framebufferStatusString", function() {
    const status = this.checkFramebufferStatus(this.FRAMEBUFFER);
    switch(status) {
    case this.FRAMEBUFFER_COMPLETE:                         return "FRAMEBUFFER_COMPLETE";
    case this.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:            return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
    case this.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:    return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
    case this.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:            return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
    case this.FRAMEBUFFER_UNSUPPORTED:                      return "FRAMEBUFFER_UNSUPPORTED";
    case this.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:           return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
    default:                                                return "FRAMEBUFFER_UNKNOWN_STATUS";
    }
    return status;
});
