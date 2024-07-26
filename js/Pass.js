import VertexLayout from "/js/VertexLayout.js"
import VertexAttrib from "/js/VertexAttrib.js"
import * as util from "/js/util.js"

export default class Pass {
    gl = null;
    layout = null;
    nVerts = 6;
    clearColor = [0.0, 0.0, 0.0, 1.0];

    constructor(gl, el) {
        this.gl = gl;

        this.layout = new VertexLayout(gl, [
            {size: 4, name: "pos"},
            {size: 4, name: "color"},
        ]);
        this.layout.attribs.forEach(attrib => {
            attrib.createBuffer(this.nVerts);
        });

        this.setClearColor();

        this.createUI(el);

        this.setAttribDataForName(
            "pos",
            new Float32Array([
                 0.50,   1.00,   0.00,   1.00,
                 1.00,  -1.00,   0.00,   1.00,
                -1.00,  -1.00,   0.00,   1.00,
                -0.50,   1.00,   0.00,   1.00,
                 1.00,  -1.00,   0.00,   1.00,
                -1.00,  -1.00,   0.00,   1.00,
            ])
        );

        this.setAttribDataForName(
            "color",
            new Float32Array([
                0.5,  0.0,  0.0,  1.0,
                0.0,  0.0,  0.0,  1.0,
                0.0,  0.0,  0.0,  1.0,
                0.0,  0.5,  0.5,  1.0,
                0.0,  0.0,  0.0,  1.0,
                0.0,  0.0,  0.0,  1.0,
            ])
        );
    }

    setClearColor(newColor = null) {
        if (newColor) {
            this.clearColor = newColor;
        }
        this.gl.clearColor(
            this.clearColor[0],
            this.clearColor[1],
            this.clearColor[2],
            this.clearColor[3]
        );
    }

    setAttribDataAtIndex(index, data, offset=0) {
        this.layout.attribs[index].setData(data, offset);
    }

    setAttribDataForName(name, data, offset=0) {
        this.layout.attribs.forEach(attrib => {
            if (attrib.name == name) {
                attrib.setData(data, offset);
                return;
            }
        })
    }

    bind() {
        this.setClearColor();
        let index = 0;
        this.layout.attribs.forEach(attrib => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
            this.gl.vertexAttribPointer(index, attrib.size, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(index);
            ++index;
        });
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, 0);
        for (let index = 0; index < this.layout.attribs.length; ++i) {
            this.gl.disableVertexAttribArray(index);
        }
    }

    draw() {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.nVerts);
        // util.checkError(this.gl);
    }

    deleteAttribBuffers() {
        this.layout.attribs.forEach(attrib => {
            attrib.deleteBuffer();
        });
    }

    createUI(el) {
        el.insertAdjacentHTML("beforeend",
            `<section>
            <label id="vertData" for="vertDataContainer">Vert Data</label>
            <div id="vertDataContainer">
                <label for="attribs">Attribs</label>
                <ul id="attribs"></ul>
                <form>
                    <label for="pass_addAttribSize">Size</label>
                    <input type="text" id="pass_addAttribSize" value="4">
                    <label for="pass_addAttribName">Name</label>
                    <input type="text" id="pass_addAttribName" value="norm">
                    <input type="submit" value="Add Attrib">
                </form>
                <label for="pass_vertCount">Count</label>
                <input type="text" id="pass_vertCount" value="${this.nVerts}">
                <label for="attribData">Attrib Data</label>
                <div id="attribData"></div>
            </div>
            </section>`
        );
        const attribData = document.getElementById("attribData");
        this.layout.attribs.forEach(attrib => {
            attrib.createUI(attribData);
        });

        document.querySelector("#vertDataContainer > form").addEventListener("submit", e => {
            e.preventDefault();
            this.addAttrib(
                parseInt(document.getElementById("pass_addAttribSize").value),
                document.getElementById("pass_addAttribName").value
            );
        });

        util.makeCollapsible(util.last(el.children));
    }

    updateDataFromUI() {
        const newNVerts = parseInt(document.getElementById("pass_vertCount").value);;
        const nVertsChanged = (this.nVerts !== newNVerts);
        this.nVerts = newNVerts;

        this.layout.attribs.forEach(attrib => {
            if (nVertsChanged) {
                attrib.deleteBuffer();
                attrib.createBuffer(this.nVerts);
                attrib.uiDirty = true; // forces data to be pulled from ui
            }
            attrib.updateDataFromUI();
        });
    }

    addAttrib(size, name) {
        // basic error checking
        if (!Number.isInteger(size) ||
            size < 1 ||
            size > 4 ||
            this.layout.hasAttribName(name)
            ) {
            console.log("Did not create new attribute.", size, name);
            return;
        }

        const attrib = this.layout.addAttrib(size, name);
        attrib.createBuffer(this.nVerts);
        attrib.createUI(document.getElementById("attribData"));
    }
}
