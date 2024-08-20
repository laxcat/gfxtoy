import App from "./App.mjs"
import ShaderProgram from "./ShaderProgram.mjs"
import Pass from "./Pass.mjs"
import Serializable from "./Serializable.mjs"
import UniformBuffer from "./UniformBuffer.mjs"
import * as ui from "./util-ui.mjs"

/*
    A project, holding all information and UI.
    Can be thought of as root of actual drawing functionality.

    TODO:
    • save each project to its own localStorage item
*/
export default class Project extends Serializable {
    static serialProps = {
        id:   undefined,
        name: undefined,
        pass: Pass,
        prog: ShaderProgram,
        unib: UniformBuffer,
        timeSaved: Date,
    };
    timeChanged = null;
    #listenForChanges = true;

    static templates = [
        {key:"blank", name:"Blank", pass: null, prog: null, unib: null},
        {key:"basic2d", name:"Basic 2D", default: true},
        {key:"basic3d", name:"Basic 3D", },
    ];

// STATIC API --------------------------------------------------------------- //

    static load(id, expectedName) {
        const storageKey = Project.getStorageKey(id);
        let serialStr;
        if (typeof id !== "number" ||
            (!(serialStr = localStorage.getItem(storageKey)))) {
            console.log(`%cWARNING! Could not load ${expectedName} (${storageKey})`, "color:red;");
            return null;
        }
        return JSON.parse(serialStr);
    }

    static getStorageKey(id) { return App.KEY_PROJ_PREFIX+id.toString(); }

    static CHANGE_EVENT = "projectchange";
    static makeChangeEvent(detail) {
        return new CustomEvent(Project.CHANGE_EVENT, {detail,bubbles:true});
    }

// API: STATUS / INFO ------------------------------------------------------- //

    get valid() { return !!this.prog?.compiled; }

    get storageKey() { return Project.getStorageKey(this.id); }

    hasChanged() {
        const changedTimeExists = (
            this.timeChanged &&
            !isNaN(this.timeChanged.valueOf())
        );
        if (this.hasSaved() && changedTimeExists) {
            return (this.timeChanged > this.timeSaved);
        }
        return changedTimeExists;
    }

    hasSaved() {
        const savedValue = this.timeSaved.valueOf();
        return (this.timeSaved && !isNaN(savedValue));
    }

    static timeFormat = Intl.DateTimeFormat(undefined, {dateStyle:"short",timeStyle:"short"});
    get statusStr() {
        const saved = this.hasSaved();
        const changed = this.hasChanged();
        let str = "";
        if (changed) str += "* ";
        if (saved) {
            str += (changed) ? "Last saved " : "Saved ";
            str += Project.timeFormat.format(this.timeSaved)
                   .replaceAll(" ", "")
                   .replaceAll("AM", "a")
                   .replaceAll("PM", "p");
        }
        else {
            str += "Not saved";
        }
        return str;
    }

    hasUnsavedChanges() {
        return (
            // has a valid changed date...
            hasChanged() &&
            // and either...
            (!hasSaved() ||
            this.timeSaved < this.timeChanged)
        )
    }

// LIFECYCLE ---------------------------------------------------------------- //

    destroy() {
        this.pass.destroy();
        this.prog.destroy();
        this.unib.destroy();
    }

    compile() {
        this.prog.compile(this.unib.name);
        App.gl.logErrors("COMPILE");
    }

    tick() {
        this.unib.update();
    }

    draw() {
        if (App.gl.hasErrors) {
            return;
        }
        this.pass.draw();
        App.gl.logErrors("DRAW");
    }

    createUI(parentEl) {
        // add pass ui
        const listEl = parentEl.appendHTML(
            `
            <section id="passes">
                <label class="collapsible">Passes</label>
                <ul></ul>
            </section>
            `
        );
        // pass will be an array eventually, making this a loop
        this.pass.createUI(listEl.children[1]);

        // add uniform buffer ui
        this.unib.createUI(parentEl);

        // add program ui
        this.prog.createUI(parentEl);

        parentEl.addEventListener(Project.CHANGE_EVENT, e => {
            if (this.#listenForChanges) {
                // console.log(e);
                this.timeChanged = new Date();
                App.projectList.updateStatusUI();
            }
        });
    }

    save() {
        this.#listenForChanges = false;
        Coloris.close();
        this.timeSaved =
        this.timeChanged = new Date();
        this.pass.updateDataFromUI();
        this.unib.updateDataFromUI();
        this.unib.update();
        this.compile();
        let serialObj = this.serialize();
        localStorage.setItem(this.storageKey, JSON.stringify(serialObj));
        console.log(serialObj);
        this.#listenForChanges = true;
    }
}
