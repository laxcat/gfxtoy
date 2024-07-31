export function loadFileSync(path) {
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send();
    if (request.status == 200) {
        return request.responseText;
    }
    return null;
}

WebGLRenderingContext.prototype.throwError =
WebGL2RenderingContext.prototype.throwError = function() {
    const err = this.getError();
    switch(err) {
    case this.INVALID_ENUM:                   throw "INVALID_ENUM";
    case this.INVALID_VALUE:                  throw "INVALID_VALUE";
    case this.INVALID_OPERATION:              throw "INVALID_OPERATION";
    case this.INVALID_FRAMEBUFFER_OPERATION:  throw "INVALID_FRAMEBUFFER_OPERATION";
    case this.OUT_OF_MEMORY:                  throw "OUT_OF_MEMORY";
    case this.CONTEXT_LOST_WEBGL:             throw "CONTEXT_LOST_WEBGL";
    default: return;
    }
}

String.prototype.toStartCase = function() {
    let str = "";
    const len = this.length;
    // was previous character whitespace?
    let prevIsWS = true;
    // for each char in string...
    for (let i = 0; i < len; ++i) {
        // is this char whitespace?
        const isWS = (
            this[i] === " " ||
            this[i] === "\n" ||
            this[i] === "\t" ||
            this[i] === "-" ||
            this[i] === "_"
        );
        // this char mets requirements to be upper cased
        if (prevIsWS && !isWS) {
            str += this[i].toUpperCase();
            prevIsWS = false;
        }
        // all other characters are copied over
        else {
            str += this[i];
            prevIsWS = isWS;
        }
    }
    return str;
}

Array.prototype.last =
HTMLCollection.prototype.last = function() {
    return this[this.length - 1];
}
