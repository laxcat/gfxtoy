import Serializable from "./common/Serializable.mjs"
import { loadFileSync } from "./common/util.mjs"
import { aceIt } from "./common/util-ui.mjs"

import App from "./App.mjs"
import Project from "./Project.mjs"

/*
    Individual shader (frag or vert) source and UI.
    Handles compling, but should only be used through ShaderProgram, which
    compiles each shader and links.
    Shows compile errors directly in editor UI.
*/
export default class Shader extends Serializable {
    static initProps = {
        key: undefined,
        src: undefined,
    };
    editor = null;          // instance of ace.editor
    errors = [];            // array of error objects, see parseErrors
    glObj = null;           // the webgl shader object
    el = null;              // reference to the primary HTML element of the UI

    static templates = [
        this.makeTemplate("vert"),
        this.makeTemplate("frag"),
        {key: "blank", src:""},
    ];
    static makeTemplate(key) {
        return {key, src: ()=>loadFileSync(`./glsl/${key}.glsl`), }
    }

    // webgl shader type
    get glType() {
        return (this.key === "vert") ? App.gl.VERTEX_SHADER :
               (this.key === "frag") ? App.gl.FRAGMENT_SHADER :
               null;
    };

    // hidden prop _src holds source code when editor isn't set yet
    get src() {
        return this.editor?.getValue() ?? this._src;
    }
    set src(val) {
        if (typeof val === "function") {
            val = val();
        }
        if (this.editor && val) {
            this.editor.setValue(val, -1);
            delete this._src;
        }
        else {
            this._src = val;
        }
    }

    destroy() {
        if (this.glObj) {
            App.gl.deleteShader(this.glObj);
            this.glObj = null;
        }
    }

    compile() {
        if (this.src === "") {
            console.log(`Will not attempt to compile, ${this.key} source not set`);
            return null;
        }

        const gl = App.gl;

        this.glObj = gl.createShader(this.glType);
        gl.shaderSource(this.glObj, this.src);
        gl.compileShader(this.glObj);

        if (!gl.getShaderParameter(this.glObj, gl.COMPILE_STATUS)) {
            console.log(`Could not compile ${this.key} this.glObj.`);
            this.parseErrors(this);
            this.destroy();
            return null;
        }
        return this.glObj;
    }

    parseErrors() {
        const Range = ace.require("ace/range").Range;

        // get the whole error string
        const info = App.gl.getShaderInfoLog(this.glObj);
        // split on lines
        const lines = info.split("\n");
        // for each line, construct an error object
        lines.forEach(line => {
            const parts = line.split(":");
            if (parts[0] === "ERROR") {
                const line = parseInt(parts[2]) - 1; // ace wants 0-index lines/cols
                const part = parts[3].trim().replaceAll("'", "");
                const partStart = this.editor.session.getLine(line).indexOf(part);
                const error = {
                    line: line,
                    partStart: partStart,
                    partEnd: partStart + part.length,
                    error: parts[4].trim(),
                    marker: null,
                };
                this.errors.push(error);
            }
        });
    }

    showErrors() {
        if (!this.editor) {
            return;
        }

        const Range = ace.require("ace/range").Range;

        let errorMsg = "";
        let annotations = [];
        this.errors.forEach(item => {
            const r = new Range(item.line, item.partStart, item.line, item.partEnd);
            item.marker = this.editor.session.addMarker(r, "ace-error", "text");
            annotations.push({
                column: item.partStart,
                row: item.line,
                text: item.error,
                type: "error",
            });
            errorMsg += `${item.line+1}:${item.partStart+1}: ${item.error}\n`;
        });
        this.editor.session.setAnnotations(annotations);

        if (errorMsg) {
            console.log(`Errors in ${this.key} shader:\n%c${errorMsg}`, "color:red;");
        }
    }

    clearErrors() {
        if (!this.editor) {
            return;
        }
        this.errors.forEach(item => {
            this.editor.session.removeMarker(item.marker);
        });
        this.editor.session.setAnnotations();
        this.errors = [];
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `<li>
            <label class="collapsible">${this.key.toStartCase()} Shader</label>
            <pre></pre>
            </li>`
        );
        this.editor = aceIt(this.el.querySelector("pre"));
        this.editor.session.setUseWrapMode(true);
        this.editor.session.setWrapLimit(100);
        this.editor.addEventListener("change", () => {
            this.clearErrors();
            this.el.dispatchEvent(Project.makeChangeEvent(`${this.key}Shader`));
        });
        if (this._src) {
            this.src = this._src;
            delete this._src;
        }
    }
}
