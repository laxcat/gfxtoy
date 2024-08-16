import App from "./App.mjs"
import Color from "./Color.mjs"
import Mesh from "./Mesh.mjs"
import Serializable from "./Serializable.mjs"
import VertexAttrib from "./VertexAttrib.mjs"
import VertexLayout from "./VertexLayout.mjs"
import * as ui from "./util-ui.mjs"

/*
    A draw pass, with necessary objects, data, and UI.
    Draws a list of meshes (bound by a vertex layout) to framebuffer.

    TODO:
    • ability to draw to texture for multiple pass pipelines
*/
export default class Pass extends Serializable {
    clearColor = new Color();
    layout = null;
    meshes = [];
    el = null;

    static templates = [
        {
            key: "basic2d",
            default: true,
            clear: "000000",
            layout: { attribs:[
                {key: "pos",   size: 4},
                {key: "color", size: 4},
            ]},
            meshes: [
                {
                    nVerts: 6,
                    attribsData: {
                        pos: {
                            data: new Float32Array([
                                0.50,   1.00,   0.00,   1.00,
                                1.00,  -1.00,   0.00,   1.00,
                               -1.00,  -1.00,   0.00,   1.00,
                               -0.50,   1.00,   0.00,   1.00,
                                1.00,  -1.00,   0.00,   1.00,
                               -1.00,  -1.00,   0.00,   1.00,
                            ]),
                            size: 4,
                        },
                        color: {
                            data: new Float32Array([
                                0.5,  0.0,  0.0,  1.0,
                                0.0,  0.0,  0.0,  1.0,
                                0.0,  0.0,  0.0,  1.0,
                                0.0,  0.5,  0.5,  1.0,
                                0.0,  0.0,  0.0,  1.0,
                                0.0,  0.0,  0.0,  1.0,
                            ]),
                            size: 4,
                        },
                    },
                },
            ],
        },
    ];

    static serialBones = {
        clearColor: undefined,
        layout: undefined,
        meshes: undefined,
    }

    constructor(serialObj) {
        super();
        this.deserialize(serialObj);
    }

    deserialize(serialObj) {
        serialObj = super.deserialize(serialObj);

        // set clear color
        this.setClearColor(serialObj.clear);

        // set new pass layout. never has buffers.
        this.layout = new VertexLayout(serialObj.layout);

        // create new meshes
        // make sure mesh buffers are destroyed
        this.destroy();
        serialObj.meshes.forEach(serialMesh => {
            serialMesh.layout = serialObj.layout;
            this.meshes.push(new Mesh(serialMesh));
        });
    }

    serialize() {
        const serialObj = super.serialize();
        serialObj.clear = this.clearColor.toRGBAStr();
        return serialObj;
    }

    destroy() {
        this.meshes.forEach(mesh => mesh.destroy());
        this.meshes = [];
    }

    setClearColor(newColor = null) {
        this.clearColor.set(newColor);
        App.gl.clearColor(...this.clearColor.data);
    }

    draw() {
        let i = this.meshes.length;
        while(i--) {
            const mesh = this.meshes[i];
            mesh.bind(this.layout);
            mesh.draw();
        }
    }

    updateDataFromUI() {
        this.meshes.forEach(mesh => mesh.updateDataFromUI());
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(`<li></li>`);
        this.#fillUI();
    }

    resetUI() {
        // clear contents and listeners
        this.el.innerHTML = "";
        // refill and recreate listeners
        this.#fillUI();
        // add global listeners
        ui.parse(this.el);
    }

    #fillUI() {
        this.el.appendHTML(
            `
            <label class="collapsible">Main</label>
            <section>

                <label>Clear Color</label>
                <input type="text" class="color" value="#${this.clearColor.toRGBAStr()}">

                <label class="collapsible">Layout</label>
                <section class="layout">
                    <ul></ul>
                    <form>
                        <label>Size</label>
                        <input type="number" min="1" max="4">
                        <label>Name</label>
                        <input type="text" pattern="[a-z]{3,12}" placeholder="[a-z]{3,12}">
                        <input type="submit" value="Add Attribute">
                    </form>
                </section>

                <label class="collapsible">Meshes</label>
                <ul class="meshes"></ul>

                <button class="action">Restore Default</button>
            </section>
            `
        );

        // add clear color handler
        const colorEl = this.el.querySelector(`input.color`);
        colorEl.addEventListener("input", e => this.setClearColor(colorEl.value));
        Coloris({
            forceAlpha: true,
        });
        Coloris.wrap(colorEl);
        Coloris(colorEl);

        // create attributes list (layout)
        const layoutEl = this.el.querySelector("section.layout > ul");
        this.layout.attribs.forEach(attrib => attrib.createUI(layoutEl));

        // create mesh list
        const meshesEl = this.el.querySelector("ul.meshes");
        this.meshes.forEach(mesh => mesh.createUI(meshesEl));

        // add form handler
        const form = this.el.querySelector("form");
        const size = form.querySelectorAll("input")[0];
        const name = form.querySelectorAll("input")[1];
        form.addEventListener("submit", e => {
            if (this.addAttrib(parseInt(size.value), name.value)) {
                form.reset();
            }
        });

        // add
        const defaultButtonEl = this.el.querySelector("button.action");
        defaultButtonEl.addEventListener("click", e => {
            e.preventDefault();
            if (confirm("Really DELETE ALL CHANGES and restore pass settings and data to default?")) {
                this.deserialize(Pass.default);
                this.resetUI();
            }
        });
    }

    addAttrib(size, name) {
        name = name.trim();

        // basic error checking
        if (!Number.isInteger(size) ||
            size < 1 ||
            size > 4 ||
            name.length < 3 ||
            this.layout.hasAttribName(name)
            ) {
            console.log("Did not create new attribute.", size, name);
            return false;
        }

        const attrib = this.layout.addAttrib({size:size, name:name});
        // create list ui for new attrib in layout ul
        attrib.createUI(this.el.querySelector("section.layout > ul"));
        // TODO: not sure about this. maybe leave mesh data alone?
        // // create data ui for each mesh in mesh list
        // this.meshes.forEach(mesh => {
        //     const meshAttrib = mesh.layout.addAttrib({
        //         size: size,
        //         name: name,
        //         data: new Float32Array(mesh.nVerts * size),
        //     });
        //     meshAttrib.createDataUI(mesh.el.querySelector("ul.attribs"));
        // });
        return true;
    }

    toString() {
        return JSON.stringify(this.serialize());
    }
}
